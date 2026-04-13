const asyncHandler = require('../utils/asyncHandler');
const Progress = require('../models/progressModel');
const pool = require('../db');
const UserProgress = require('../models/userProgressModel');
const Certificate = require('../models/certificateModel');

/**
 * POST /api/progress/complete
 * Mark a lecture as completed by the user
 * Requires JWT authentication
 * Body: { courseId, lectureId }
 */
exports.markLectureComplete = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From JWT token
  const { courseId, lectureId } = req.body;

  // Validate input
  if (!courseId || !lectureId) {
    return res.status(400).json({
      success: false,
      error: 'courseId and lectureId are required'
    });
  }

  // Verify course exists
  const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }

  // Verify lecture exists and belongs to course
  const lectureCheck = await pool.query(
    'SELECT id, order_index FROM lessons WHERE id = $1 AND course_id = $2',
    [lectureId, courseId]
  );
  if (lectureCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Lecture not found in this course'
    });
  }

  const enrollmentCheck = await pool.query(
    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
    [userId, courseId]
  );
  if (enrollmentCheck.rows.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Only enrolled users can complete lessons'
    });
  }

  const orderedLessons = await pool.query(
    'SELECT id FROM lessons WHERE course_id = $1 ORDER BY order_index ASC, id ASC',
    [courseId]
  );
  const currentIndex = orderedLessons.rows.findIndex((row) => Number(row.id) === Number(lectureId));
  if (currentIndex > 0) {
    const previousLectureId = orderedLessons.rows[currentIndex - 1].id;
    const previousState = await UserProgress.getLessonProgressState(userId, previousLectureId);
    if (!previousState.completed) {
      return res.status(400).json({
        success: false,
        error: 'Complete the previous lesson before this one'
      });
    }
  }

  const lessonProgress = await UserProgress.getLessonProgressState(userId, lectureId);
  if ((lessonProgress.watchedTime || 0) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Watch the lesson before marking it complete'
    });
  }

  const quizAttempted = await UserProgress.hasLessonQuizAttempt(userId, lectureId);
  if (!quizAttempted) {
    return res.status(400).json({
      success: false,
      error: 'Attempt lesson quiz before marking lesson complete'
    });
  }

  // Mark lecture as completed
  const progress = await UserProgress.upsertProgress({
    userId,
    courseId,
    lectureId,
    completed: true,
    watchedTime: lessonProgress.watchedTime
  });

  const completion = await UserProgress.getCourseCompletion(userId, courseId);
  if (completion.completionPercentage === 100) {
    await Certificate.issueForUserCourse(userId, courseId);
  }

  res.status(200).json({
    success: true,
    message: 'Lecture marked as completed',
    data: progress
  });
});

/**
 * POST /api/progress/watch
 * Save watch time for a lecture
 * Requires JWT authentication
 * Body: { courseId, lectureId, watchedTime }
 */
exports.saveWatchTime = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From JWT token
  const { courseId, lectureId, watchedTime } = req.body;

  // Validate input
  if (!courseId || !lectureId || watchedTime === undefined) {
    return res.status(400).json({
      success: false,
      error: 'courseId, lectureId, and watchedTime are required'
    });
  }

  if (isNaN(watchedTime) || watchedTime < 0) {
    return res.status(400).json({
      success: false,
      error: 'watchedTime must be a non-negative number'
    });
  }

  // Verify course exists
  const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }

  // Verify lecture exists and belongs to course
  const lectureCheck = await pool.query(
    'SELECT id FROM lessons WHERE id = $1 AND course_id = $2',
    [lectureId, courseId]
  );
  if (lectureCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Lecture not found in this course'
    });
  }

  // Update watch time
  let progress = await Progress.updateWatchTime({
    user_id: userId,
    course_id: courseId,
    lecture_id: lectureId,
    watched_time: parseInt(watchedTime, 10)
  });

  const quizAttempted = await UserProgress.hasLessonQuizAttempt(userId, lectureId);
  if (quizAttempted && parseInt(watchedTime, 10) > 0) {
    progress = await UserProgress.upsertProgress({
      userId,
      courseId,
      lectureId,
      completed: true,
      watchedTime: parseInt(watchedTime, 10)
    });
  }

  res.status(200).json({
    success: true,
    message: quizAttempted ? 'Watch time saved and lesson completion updated' : 'Watch time saved successfully',
    data: progress
  });
});

/**
 * GET /api/progress/:courseId
 * Calculate and return course progress percentage for current user
 * Requires JWT authentication
 * Returns: { progress: 65, totalLectures: 20, completedLectures: 13 }
 */
exports.getCourseProgressPercentage = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From JWT token
  const courseId = parseInt(req.params.courseId, 10);

  if (isNaN(courseId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid courseId'
    });
  }

  // Verify course exists
  const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }

  // Calculate progress
  const progressData = await Progress.calculateCourseProgress(userId, courseId);

  res.status(200).json({
    success: true,
    data: progressData
  });
});

/**
 * GET /api/progress/:courseId/details
 * Get detailed progress information for a course
 * Requires JWT authentication
 * Returns array of lectures with completion status
 */
exports.getCourseProgressDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From JWT token
  const courseId = parseInt(req.params.courseId, 10);

  if (isNaN(courseId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid courseId'
    });
  }

  // Verify course exists
  const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }

  // Get detailed progress
  const lectures = await Progress.getCourseProgress(userId, courseId);
  const progressData = await Progress.calculateCourseProgress(userId, courseId);

  res.status(200).json({
    success: true,
    data: {
      ...progressData,
      lectures
    }
  });
});

/**
 * GET /api/progress (Admin)
 * Get all progress records
 */
exports.getAllProgress = asyncHandler(async (req, res) => {
  let rows;
  if (req.user.role === 'admin') {
    rows = await Progress.findAll();
  } else {
    rows = await Progress.findByUser(req.user.id);
  }

  res.json({
    success: true,
    data: rows
  });
});

/**
 * GET /api/progress/:id (Admin)
 * Get single progress record
 */
exports.getProgressById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await Progress.findById(id);
  if (!row) {
    return res.status(404).json({
      success: false,
      error: 'Progress record not found'
    });
  }
  res.json({
    success: true,
    data: row
  });
});

/**
 * DELETE /api/progress/:id (Admin)
 * Delete progress record
 */
exports.deleteProgress = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  // Verify record exists
  const existing = await Progress.findById(id);
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Progress record not found'
    });
  }

  await Progress.remove(id);
  res.status(204).send();
});

/**
 * GET /api/progress/user/:userId/course/:courseId (Admin/Instructor)
 * Get course progress for a specific user
 */
exports.getUserCourseProgress = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const courseId = parseInt(req.params.courseId, 10);

  if (isNaN(userId) || isNaN(courseId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid userId or courseId'
    });
  }

  // Verify course exists
  const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }

  // Get progress for the user
  const lectures = await Progress.getCourseProgress(userId, courseId);
  const progressData = await Progress.calculateCourseProgress(userId, courseId);

  res.status(200).json({
    success: true,
    data: {
      ...progressData,
      lectures
    }
  });
});
