const Enrollment = require('../models/enrollmentModel');
const asyncHandler = require('../utils/asyncHandler');

exports.enroll = asyncHandler(async (req, res) => {
  const { user_id, course_id } = req.body;
  if (!user_id || !course_id) return res.status(400).json({ error: 'user_id and course_id required' });
  
  // Verify course exists before attempting enrollment
  const pool = require('../db');
  const courseCheck = await pool.query('SELECT id, title FROM courses WHERE id = $1', [course_id]);
  
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({ 
      error: 'Course not found',
      message: `Course with ID ${course_id} does not exist. Please refresh the page to get updated course list.`,
      course_id: course_id
    });
  }
  
  const result = await Enrollment.enroll({ user_id, course_id });
  
  if (!result) {
    // Already enrolled, but let's make sure it's active
    const existing = await pool.query(
      'UPDATE enrollments SET is_active = true WHERE user_id = $1 AND course_id = $2 RETURNING *',
      [user_id, course_id]
    );
    return res.status(200).json({ 
      message: 'Already enrolled', 
      enrollment: existing.rows[0],
      alreadyEnrolled: true 
    });
  }
  
  res.status(201).json({ 
    message: 'Enrollment successful',
    enrollment: result,
    alreadyEnrolled: false
  });
});

exports.listUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const rows = await Enrollment.listByUser(userId);
  res.json(rows);
});

exports.listAll = asyncHandler(async (req, res) => {
  const rows = await Enrollment.listAll();
  res.json({ success: true, data: rows });
});

exports.listCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const rows = await Enrollment.listByCourse(courseId);
  res.json(rows);
});

exports.unenroll = asyncHandler(async (req, res) => {
  const { user_id, course_id } = req.body;
  if (!user_id || !course_id) return res.status(400).json({ error: 'user_id and course_id required' });
  await Enrollment.unenroll({ user_id, course_id });
  res.status(204).send();
});
