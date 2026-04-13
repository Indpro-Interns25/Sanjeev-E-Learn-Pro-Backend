const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');
const LessonProgress = require('../models/lessonProgressModel');

/**
 * POST /api/progress/update
 * Update lesson progress
 * Body: { userId, courseId, lessonId, progress }
 */
exports.updateProgress = asyncHandler(async (req, res) => {
  const { userId, courseId, lessonId, progress } = req.body;

  // Validate input
  if (!userId || !courseId || !lessonId || progress === undefined) {
    return res.status(400).json({
      success: false,
      message: 'userId, courseId, lessonId, and progress are required'
    });
  }

  // Validate progress is between 0-100
  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return res.status(400).json({
      success: false,
      message: 'progress must be a number between 0 and 100'
    });
  }

  // Verify user is enrolled in course or is admin/instructor
  const isPrivileged = req.user.role === 'admin' || req.user.role === 'instructor';
  if (!isPrivileged && req.user.id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: cannot update progress for another user'
    });
  }

  if (!isPrivileged) {
    const enrollment = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
      [userId, courseId]
    );
    if (enrollment.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: not enrolled in this course'
      });
    }
  }

  // Verify lesson exists
  const lessonCheck = await pool.query(
    'SELECT id FROM lessons WHERE id = $1 AND course_id = $2',
    [lessonId, courseId]
  );
  if (lessonCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found in this course'
    });
  }

  // Update progress
  const result = await LessonProgress.updateProgress(userId, courseId, lessonId, progress);

  res.json({
    success: true,
    message: `Progress updated to ${progress}%${result.completed ? ' - Lesson completed!' : ''}`,
    data: {
      progress: result.progress,
      completed: result.completed,
      updated_at: result.updated_at
    }
  });
});

/**
 * GET /api/progress/:courseId/:lessonId
 * Get lesson progress for current user
 */
exports.getProgress = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;
  const userId = req.user.id;

  // Validate input
  if (!courseId || !lessonId) {
    return res.status(400).json({
      success: false,
      message: 'courseId and lessonId are required'
    });
  }

  // Verify user is enrolled in course or is admin/instructor
  const isPrivileged = req.user.role === 'admin' || req.user.role === 'instructor';
  if (!isPrivileged) {
    const enrollment = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
      [userId, courseId]
    );
    if (enrollment.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: not enrolled in this course'
      });
    }
  }

  // Get progress
  const progress = await LessonProgress.getProgress(userId, parseInt(courseId, 10), parseInt(lessonId, 10));

  res.json({
    success: true,
    data: progress
  });
});

/**
 * GET /api/progress/:courseId
 * Get all lesson progress for a course
 */
exports.getCourseProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  // Verify user is enrolled in course or is admin/instructor
  const isPrivileged = req.user.role === 'admin' || req.user.role === 'instructor';
  if (!isPrivileged) {
    const enrollment = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
      [userId, courseId]
    );
    if (enrollment.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: not enrolled in this course'
      });
    }
  }

  // Get all lessons in course
  const lessonsResult = await pool.query(
    `SELECT id, title, order_index FROM lessons
     WHERE course_id = $1
     ORDER BY order_index ASC`,
    [courseId]
  );

  const lessons = lessonsResult.rows;

  // Get progress for all lessons
  const progressResult = await LessonProgress.getCourseProgress(userId, parseInt(courseId, 10));
  const progressMap = {};
  progressResult.forEach(p => {
    progressMap[p.lesson_id] = {
      progress: p.progress,
      completed: p.completed
    };
  });

  // Build response with all lessons and their progress
  const lessonProgress = lessons.map(lesson => ({
    lesson_id: lesson.id,
    title: lesson.title,
    order_index: lesson.order_index,
    progress: progressMap[lesson.id]?.progress || 0,
    completed: progressMap[lesson.id]?.completed || false
  }));

  // Count completed lessons
  const completedCount = lessonProgress.filter(l => l.completed).length;
  const totalCount = lessonProgress.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  res.json({
    success: true,
    data: {
      lessons: lessonProgress,
      completed_lessons: completedCount,
      total_lessons: totalCount,
      all_completed: allCompleted
    }
  });
});

/**
 * GET /api/progress/user/:userId/course/:courseId
 * Get progress for specific user (admin/instructor only)
 */
exports.getUserCourseProgress = asyncHandler(async (req, res) => {
  const { userId, courseId } = req.params;

  // Admin/instructor only
  if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: admin or instructor access required'
    });
  }

  // Get all lessons in course
  const lessonsResult = await pool.query(
    `SELECT id, title, order_index FROM lessons
     WHERE course_id = $1
     ORDER BY order_index ASC`,
    [courseId]
  );

  const lessons = lessonsResult.rows;

  // Get progress for all lessons
  const progressResult = await LessonProgress.getCourseProgress(parseInt(userId, 10), parseInt(courseId, 10));
  const progressMap = {};
  progressResult.forEach(p => {
    progressMap[p.lesson_id] = {
      progress: p.progress,
      completed: p.completed
    };
  });

  // Build response
  const lessonProgress = lessons.map(lesson => ({
    lesson_id: lesson.id,
    title: lesson.title,
    order_index: lesson.order_index,
    progress: progressMap[lesson.id]?.progress || 0,
    completed: progressMap[lesson.id]?.completed || false
  }));

  const completedCount = lessonProgress.filter(l => l.completed).length;
  const totalCount = lessonProgress.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  res.json({
    success: true,
    data: {
      user_id: parseInt(userId, 10),
      course_id: parseInt(courseId, 10),
      lessons: lessonProgress,
      completed_lessons: completedCount,
      total_lessons: totalCount,
      all_completed: allCompleted
    }
  });
});
