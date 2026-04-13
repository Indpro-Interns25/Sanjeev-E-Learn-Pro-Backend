const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');
const QuizSystem = require('../models/quizSystemModel');
const UserProgress = require('../models/userProgressModel');
const Assessment = require('../models/assessmentModel');
const LessonProgress = require('../models/lessonProgressModel');

function validateQuizPayload(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'questions must be a non-empty array';
  }

  if (questions.length < 10) {
    return 'At least 10 questions are required for a quiz';
  }

  for (const question of questions) {
    if (!question.question_text || typeof question.question_text !== 'string') {
      return 'Each question must include question_text';
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      return 'Each question must include at least 2 options';
    }

    const correctCount = question.options.filter((opt) => Boolean(opt.is_correct)).length;
    if (correctCount !== 1) {
      return 'Each question must have exactly one correct option';
    }

    for (const option of question.options) {
      if (!option.option_text || typeof option.option_text !== 'string') {
        return 'Each option must include option_text';
      }
    }
  }

  return null;
}

exports.createQuiz = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const { title, questions } = req.body;

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required' });
  }

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ success: false, message: 'Quiz title is required' });
  }

  const payloadError = validateQuizPayload(questions);
  if (payloadError) {
    return res.status(400).json({ success: false, message: payloadError });
  }

  const course = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (course.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  const quiz = await QuizSystem.upsertQuiz({
    courseId,
    title: title.trim(),
    createdBy: req.user.id,
    questions
  });

  res.status(201).json({ success: true, data: { id: quiz.id, course_id: quiz.course_id, title: quiz.title } });
});

exports.getQuizByCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required' });
  }

  const quiz = await QuizSystem.getQuizByCourseId(courseId);
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found for this course' });
  }

  const safeQuestions = quiz.questions.map((q) => ({
    id: q.id,
    question_text: q.question_text,
    options: q.options.map((o) => ({ id: o.id, option_text: o.option_text }))
  }));

  res.json({
    success: true,
    data: {
      id: quiz.id,
      course_id: quiz.course_id,
      title: quiz.title,
      questions: safeQuestions,
      availableQuestions: quiz.available_questions || safeQuestions.length,
      returnedQuestions: safeQuestions.length
    }
  });
});

exports.submitQuiz = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user.id;
  const { answers } = req.body;

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required' });
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ success: false, message: 'answers must be a non-empty array' });
  }

  const enrolled = await pool.query(
    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
    [userId, courseId]
  );
  if (enrolled.rows.length === 0) {
    return res.status(403).json({ success: false, message: 'Only enrolled users can take this quiz' });
  }

  const completion = await UserProgress.getCourseCompletion(userId, courseId);
  if (completion.completionPercentage < 100) {
    return res.status(403).json({
      success: false,
      message: 'Quiz is unlocked only after 100% course progress',
      progress: completion.completionPercentage
    });
  }

  const quiz = await QuizSystem.getQuizByCourseId(courseId, { forSubmission: true });
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found for this course' });
  }

  const answerMap = new Map();
  for (const ans of answers) {
    if (!ans.question_id || !ans.option_id) {
      return res.status(400).json({ success: false, message: 'Each answer must include question_id and option_id' });
    }
    answerMap.set(Number(ans.question_id), Number(ans.option_id));
  }

  let score = 0;
  const resultDetails = quiz.questions.map((q) => {
    const selectedOptionId = answerMap.get(Number(q.id));
    const correctOption = q.options.find((opt) => opt.is_correct);
    const selectedOption = q.options.find((opt) => Number(opt.id) === Number(selectedOptionId));
    const isCorrect = selectedOption && correctOption && selectedOption.id === correctOption.id;
    if (isCorrect) score += 1;

    return {
      question_id: q.id,
      selected_option_id: selectedOptionId || null,
      correct_option_id: correctOption ? correctOption.id : null,
      correct_option_text: correctOption ? correctOption.option_text : null,
      is_correct: Boolean(isCorrect)
    };
  });

  const total = quiz.questions.length;
  const storedResult = await QuizSystem.saveResult({ userId, courseId, score, total });

  res.json({
    success: true,
    data: {
      result_id: storedResult.id,
      user_id: userId,
      course_id: courseId,
      score,
      total,
      created_at: storedResult.created_at,
      answers: resultDetails
    }
  });
});

exports.getUserResult = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user.id;

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required' });
  }

  const result = await QuizSystem.getResultByUserCourse(userId, courseId);
  if (!result) {
    return res.status(404).json({ success: false, message: 'Quiz result not found' });
  }

  res.json({ success: true, data: result });
});

exports.getLessonQuiz = asyncHandler(async (req, res) => {
  const lessonId = parseInt(req.params.lessonId, 10);
  const userId = req.user.id;

  if (!lessonId || Number.isNaN(lessonId)) {
    return res.status(400).json({ success: false, message: 'Valid lessonId is required', data: null });
  }

  const lesson = await Assessment.getLessonById(lessonId);
  if (!lesson) {
    return res.status(404).json({ success: false, message: 'Lesson not found', data: null });
  }

  const isEnrolled = await Assessment.isUserEnrolledInCourse(userId, lesson.course_id);
  if (!isEnrolled) {
    return res.status(403).json({ success: false, message: 'Only enrolled users can access lesson quizzes', data: null });
  }

  const isUnlocked = await Assessment.isLessonUnlocked(userId, lesson.course_id, lessonId);
  if (!isUnlocked) {
    return res.status(400).json({ success: false, message: 'Complete previous lesson before taking this quiz', data: null });
  }

  // IMPORTANT: Check if lesson is completed (quiz unlock requirement)
  const lessonCompleted = await LessonProgress.isLessonCompleted(userId, lessonId);
  if (!lessonCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Complete the lesson first to access quiz',
      data: null
    });
  }

  const questions = await Assessment.getLessonQuizQuestions(lessonId);
  const totalAvailable = await Assessment.countLessonQuizQuestions(lessonId);
  if (questions.length === 0) {
    return res.status(404).json({ success: false, message: 'Lesson quiz not found', data: null });
  }

  res.json({
    success: true,
    message: 'Lesson quiz fetched successfully',
    data: {
      lessonId,
      courseId: lesson.course_id,
      questions,
      availableQuestions: totalAvailable,
      returnedQuestions: questions.length
    }
  });
});

exports.submitLessonQuiz = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { lessonId, answers = [] } = req.body;
  const parsedLessonId = parseInt(lessonId, 10);

  if (!parsedLessonId || Number.isNaN(parsedLessonId)) {
    return res.status(400).json({ success: false, message: 'Valid lessonId is required', data: null });
  }

  if (!Array.isArray(answers)) {
    return res.status(400).json({ success: false, message: 'answers must be an array', data: null });
  }

  const lesson = await Assessment.getLessonById(parsedLessonId);
  if (!lesson) {
    return res.status(404).json({ success: false, message: 'Lesson not found', data: null });
  }

  const isEnrolled = await Assessment.isUserEnrolledInCourse(userId, lesson.course_id);
  if (!isEnrolled) {
    return res.status(403).json({ success: false, message: 'Only enrolled users can submit lesson quizzes', data: null });
  }

  const isUnlocked = await Assessment.isLessonUnlocked(userId, lesson.course_id, parsedLessonId);
  if (!isUnlocked) {
    return res.status(400).json({ success: false, message: 'Complete previous lesson before taking this quiz', data: null });
  }

  // IMPORTANT: Check if lesson is completed (quiz unlock requirement)
  const lessonCompleted = await LessonProgress.isLessonCompleted(userId, parsedLessonId);
  if (!lessonCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Complete the lesson first to access quiz',
      data: null
    });
  }

  const questions = await Assessment.getLessonQuizQuestions(parsedLessonId);
  if (questions.length === 0) {
    return res.status(404).json({ success: false, message: 'Lesson quiz not found', data: null });
  }

  const result = await Assessment.gradeLessonQuiz(parsedLessonId, answers);

  await Assessment.saveLessonQuizAttempt(userId, parsedLessonId);

  const progressState = await UserProgress.getLessonProgressState(userId, parsedLessonId);
  const shouldComplete = (progressState.watchedTime || 0) > 0;
  if (shouldComplete) {
    await UserProgress.upsertProgress({
      userId,
      courseId: lesson.course_id,
      lectureId: parsedLessonId,
      completed: true,
      watchedTime: progressState.watchedTime
    });
  }

  res.json({
    success: true,
    message: 'Lesson quiz submitted successfully',
    data: {
      lessonId: parsedLessonId,
      courseId: lesson.course_id,
      attempted: true,
      score: result.score,
      totalQuestions: result.total,
      lessonCompleted: shouldComplete
    }
  });
});
