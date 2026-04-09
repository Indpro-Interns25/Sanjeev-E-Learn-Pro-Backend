const asyncHandler = require('../utils/asyncHandler');
const Progress = require('../models/progressModel');
const pool = require('../db');

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
    'SELECT id FROM lessons WHERE id = $1 AND course_id = $2',
    [lectureId, courseId]
  );
  if (lectureCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Lecture not found in this course'
    });
  }

  // Mark lecture as completed
  const progress = await Progress.markLectureComplete({
    user_id: userId,
    course_id: courseId,
    lecture_id: lectureId
  });

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
  const progress = await Progress.updateWatchTime({
    user_id: userId,
    course_id: courseId,
    lecture_id: lectureId,
    watched_time: parseInt(watchedTime, 10)
  });

  res.status(200).json({
    success: true,
    message: 'Watch time saved successfully',
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
