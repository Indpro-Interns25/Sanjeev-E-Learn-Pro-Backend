const asyncHandler = require('../utils/asyncHandler');
const Quiz = require('../models/quizModel');

// POST /api/quizzes - Create quiz (instructor/admin)
exports.createQuiz = asyncHandler(async (req, res) => {
  const { course_id, title, passing_score = 60, questions } = req.body;
  const createdBy = req.user.id;

  if (!course_id || !title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      error: 'course_id, title and questions array are required'
    });
  }

  if (questions.length < 10) {
    return res.status(400).json({
      error: 'At least 10 questions are required per quiz'
    });
  }

  for (const q of questions) {
    if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || !q.correct_answer) {
      return res.status(400).json({
        error: 'Each question must include question, options (min 2), and correct_answer'
      });
    }
  }

  const quiz = await Quiz.createQuiz({
    courseId: parseInt(course_id, 10),
    title,
    passingScore: parseInt(passing_score, 10),
    createdBy,
    questions
  });

  res.status(201).json({ success: true, data: quiz });
});

// GET /api/quizzes/:quizId
exports.getQuiz = asyncHandler(async (req, res) => {
  const quizId = parseInt(req.params.quizId, 10);
  const quiz = await Quiz.getQuizWithQuestions(quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const safeQuestions = quiz.questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options
  }));

  res.json({
    success: true,
    data: {
      ...quiz,
      questions: safeQuestions,
      availableQuestions: quiz.available_questions || safeQuestions.length,
      returnedQuestions: safeQuestions.length
    }
  });
});

// POST /api/quizzes/:quizId/submit - Submit quiz answers
exports.submitQuiz = asyncHandler(async (req, res) => {
  const quizId = parseInt(req.params.quizId, 10);
  const { answers } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers array is required' });
  }

  const quiz = await Quiz.getQuizWithQuestions(quizId, { forSubmission: true });
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  let score = 0;
  const results = quiz.questions.map(q => {
    const userAnswer = answers.find(a => a.question_id === q.id);
    const isCorrect = userAnswer && userAnswer.answer === q.correct_answer;
    if (isCorrect) score++;
    return { question_id: q.id, correct: isCorrect };
  });

  const total = quiz.questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= (quiz.passing_score || 60);

  await Quiz.saveResult({ quizId, userId, score, total, percentage, passed });

  res.json({
    success: true,
    data: {
      quiz_id: quizId,
      score,
      total,
      percentage,
      passed,
      results
    },
    message: passed ? 'Congratulations! You passed the quiz.' : 'Quiz submitted. Better luck next time!'
  });
});
