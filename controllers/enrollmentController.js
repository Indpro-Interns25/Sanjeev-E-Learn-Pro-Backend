const Enrollment = require('../models/enrollmentModel');
const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

function resolveTargetUserId(req, bodyUserId) {
  const requester = req.user;
  const parsedBodyUserId = bodyUserId ? parseInt(bodyUserId, 10) : null;

  if (requester.role === 'admin') {
    return parsedBodyUserId || requester.id;
  }

  return requester.id;
}

async function ensureCourseOwnershipIfInstructor(req, courseId) {
  if (req.user.role !== 'instructor') return true;

  const owned = await pool.query('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, req.user.id]);
  return owned.rows.length > 0;
}

exports.enroll = asyncHandler(async (req, res) => {
  const { user_id, course_id } = req.body;
  const targetUserId = resolveTargetUserId(req, user_id);
  if (!targetUserId || !course_id) return res.status(400).json({ error: 'course_id required' });
  
  // Verify course exists before attempting enrollment
  const courseCheck = await pool.query('SELECT id, title FROM courses WHERE id = $1', [course_id]);
  
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({ 
      error: 'Course not found',
      message: `Course with ID ${course_id} does not exist. Please refresh the page to get updated course list.`,
      course_id: course_id
    });
  }
  
  const result = await Enrollment.enroll({ user_id: targetUserId, course_id });
  
  if (!result) {
    // Already enrolled, but let's make sure it's active
    const existing = await pool.query(
      'UPDATE enrollments SET is_active = true WHERE user_id = $1 AND course_id = $2 RETURNING *',
      [targetUserId, course_id]
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
  const requestedUserId = parseInt(req.params.userId, 10);
  const userId = req.user.role === 'admin' ? requestedUserId : req.user.id;

  if (req.user.role !== 'admin' && requestedUserId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: cannot view another user enrollments' });
  }

  const rows = await Enrollment.listByUser(userId);
  res.json(rows);
});

exports.listAll = asyncHandler(async (req, res) => {
  let rows;

  if (req.user.role === 'admin') {
    rows = await Enrollment.listAll();
  } else if (req.user.role === 'instructor') {
    const result = await pool.query(
      `SELECT e.*, u.name AS user_name, u.email AS user_email, c.title AS course_title
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       JOIN courses c ON c.id = e.course_id
       WHERE c.instructor_id = $1
       ORDER BY e.id`,
      [req.user.id]
    );
    rows = result.rows;
  } else {
    const result = await pool.query(
      `SELECT e.*, c.title AS course_title
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = $1
       ORDER BY e.id`,
      [req.user.id]
    );
    rows = result.rows;
  }

  res.json({ success: true, data: rows });
});

exports.listCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);

  const allowed = await ensureCourseOwnershipIfInstructor(req, courseId);
  if (!allowed && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: not instructor of this course' });
  }

  const rows = await Enrollment.listByCourse(courseId);
  res.json(rows);
});

exports.unenroll = asyncHandler(async (req, res) => {
  const { user_id, course_id } = req.body;
  const targetUserId = resolveTargetUserId(req, user_id);
  if (!targetUserId || !course_id) return res.status(400).json({ error: 'course_id required' });

  if (req.user.role === 'instructor') {
    const allowed = await ensureCourseOwnershipIfInstructor(req, parseInt(course_id, 10));
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: not instructor of this course' });
    }
  }

  await Enrollment.unenroll({ user_id: targetUserId, course_id });
  res.status(204).send();
});
