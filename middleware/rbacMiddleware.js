const { checkRole } = require('./authMiddleware');
const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');

const allowRoles = (...roles) => checkRole(...roles);

const requireEnrollment = asyncHandler(async (req, res, next) => {
  const userId = req.user && req.user.id;
  const courseId = parseInt(req.params.courseId || req.body.course_id, 10);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid course_id is required' });
  }

  const enrollment = await pool.query(
    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
    [userId, courseId]
  );

  if (enrollment.rows.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'You must be enrolled in this course to access its lectures'
    });
  }

  next();
});

module.exports = {
  allowRoles,
  requireEnrollment
};
