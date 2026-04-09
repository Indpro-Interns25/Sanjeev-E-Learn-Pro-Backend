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
  const parsedCourseId = parseInt(course_id, 10);

  if (!targetUserId || !parsedCourseId) return res.status(400).json({ error: 'course_id required' });
  
  // Verify course and student exist before attempting enrollment
  const [courseCheck, userCheck] = await Promise.all([
    pool.query('SELECT id, title FROM courses WHERE id = $1', [parsedCourseId]),
    pool.query('SELECT id, role FROM users WHERE id = $1', [targetUserId])
  ]);
  
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({ 
      error: 'Course not found',
      message: `Course with ID ${parsedCourseId} does not exist. Please refresh the page to get updated course list.`,
      course_id: parsedCourseId
    });
  }

  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (userCheck.rows[0].role !== 'student') {
    return res.status(400).json({ error: 'Only students can be enrolled in courses' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingEnrollment = await client.query(
      'SELECT id, is_active FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [targetUserId, parsedCourseId]
    );

    const result = await client.query(
      'INSERT INTO enrollments (user_id, course_id, is_active, enrolled_at) VALUES ($1, $2, true, NOW()) ON CONFLICT (user_id, course_id) DO UPDATE SET is_active = true RETURNING *',
      [targetUserId, parsedCourseId]
    );

    await client.query(
      `UPDATE users
       SET enrolled_courses = CASE
         WHEN enrolled_courses IS NULL THEN ARRAY[$2]::integer[]
         WHEN NOT ($2 = ANY(enrolled_courses)) THEN array_append(enrolled_courses, $2)
         ELSE enrolled_courses
       END
       WHERE id = $1 AND role = 'student'`,
      [targetUserId, parsedCourseId]
    );

    await client.query('COMMIT');

    return res.status(existingEnrollment.rows[0]?.is_active ? 200 : 201).json({ 
      message: existingEnrollment.rows[0]?.is_active ? 'Already enrolled' : 'Enrollment successful',
      enrollment: result.rows[0],
      alreadyEnrolled: !!existingEnrollment.rows[0]?.is_active
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
  const parsedCourseId = parseInt(course_id, 10);
  if (!targetUserId || !parsedCourseId) return res.status(400).json({ error: 'course_id required' });

  if (req.user.role === 'instructor') {
    const allowed = await ensureCourseOwnershipIfInstructor(req, parsedCourseId);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: not instructor of this course' });
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2', [targetUserId, parsedCourseId]);
    await client.query(
      `UPDATE users
       SET enrolled_courses = array_remove(COALESCE(enrolled_courses, '{}'::integer[]), $2)
       WHERE id = $1 AND role = 'student'`,
      [targetUserId, parsedCourseId]
    );

    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
