const asyncHandler = require('../utils/asyncHandler');
const Assessment = require('../models/assessmentModel');
const UserProgress = require('../models/userProgressModel');
const LessonProgress = require('../models/lessonProgressModel');

exports.getFinalTestByCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user.id;

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required', data: null });
  }

  const isEnrolled = await Assessment.isUserEnrolledInCourse(userId, courseId);
  if (!isEnrolled) {
    return res.status(403).json({ success: false, message: 'Only enrolled users can access final tests', data: null });
  }

  // IMPORTANT: Check if ALL lessons in course are completed (final test unlock requirement)
  const allCompleted = await LessonProgress.isAllLessonsCompleted(userId, courseId);
  if (!allCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Complete all lessons before accessing final test',
      data: null
    });
  }

  const questions = await Assessment.getFinalTestQuestions(courseId);
  const totalAvailable = await Assessment.countFinalTestQuestions(courseId);
  if (questions.length === 0) {
    return res.status(404).json({ success: false, message: 'Final test not found for this course', data: null });
  }

  res.json({
    success: true,
    message: 'Final test fetched successfully',
    data: {
      courseId,
      questions,
      availableQuestions: totalAvailable,
      returnedQuestions: questions.length
    }
  });
});

exports.submitFinalTest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { courseId, answers } = req.body;
  const parsedCourseId = parseInt(courseId, 10);

  if (!parsedCourseId || Number.isNaN(parsedCourseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required', data: null });
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ success: false, message: 'answers must be a non-empty array', data: null });
  }

  const isEnrolled = await Assessment.isUserEnrolledInCourse(userId, parsedCourseId);
  if (!isEnrolled) {
    return res.status(403).json({ success: false, message: 'Only enrolled users can submit final tests', data: null });
  }

  // IMPORTANT: Check if ALL lessons in course are completed (final test unlock requirement)
  const allCompleted = await LessonProgress.isAllLessonsCompleted(userId, parsedCourseId);
  if (!allCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Complete all lessons before accessing final test',
      data: null
    });
  }

  const completion = await UserProgress.getCourseCompletion(userId, parsedCourseId);
  if (!completion.completionReady) {
    return res.status(400).json({
      success: false,
      message: 'Complete all lessons and attempt all lesson quizzes before final test',
      data: completion
    });
  }

  const questions = await Assessment.getFinalTestQuestions(parsedCourseId);
  if (questions.length === 0) {
    return res.status(404).json({ success: false, message: 'Final test not found for this course', data: null });
  }

  const result = await Assessment.gradeFinalTest(parsedCourseId, answers);
  const attempt = await Assessment.saveFinalTestAttempt(userId, parsedCourseId, result.score, result.passed);

  res.json({
    success: true,
    message: result.passed ? 'Final test passed' : 'Final test failed. You can retry.',
    data: {
      attemptId: attempt.id,
      userId,
      courseId: parsedCourseId,
      score: result.score,
      passed: result.passed,
      passThreshold: 70,
      totalQuestions: result.total,
      correctAnswers: result.correctCount,
      attemptedAt: attempt.attempted_at
    }
  });
});
