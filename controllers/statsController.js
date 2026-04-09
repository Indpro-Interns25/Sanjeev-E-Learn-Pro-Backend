const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

/**
 * GET /stats or /api/stats
 * Returns real-time platform statistics for frontend cards.
 */
exports.getPublicStats = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM courses) AS total_courses,
      COALESCE(
        (SELECT ROUND(AVG(rating)::numeric, 1) FROM courses WHERE rating IS NOT NULL),
        0
      )::float AS average_rating
  `);

  const row = result.rows[0] || {};

  res.json({
    totalUsers: row.total_users || 0,
    totalCourses: row.total_courses || 0,
    averageRating: row.average_rating || 0
  });
});

/**
 * GET /api/stats
 * Returns dashboard statistics with real data from database
 */
exports.getStats = asyncHandler(async (req, res) => {
  // Keep backward compatibility by serving the same real-time summary shape.
  if (!req.user) {
    return exports.getPublicStats(req, res);
  }

  if (req.user.role !== 'admin') {
    const [enrolled, completed, completedLessons] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as total FROM enrollments WHERE user_id = $1 AND is_active = true', [req.user.id]),
      pool.query('SELECT COUNT(*)::int as total FROM enrollments WHERE user_id = $1 AND completed_at IS NOT NULL', [req.user.id]),
      pool.query('SELECT COUNT(*)::int as total FROM user_progress WHERE user_id = $1 AND completed = true', [req.user.id])
    ]);

    return res.json({
      success: true,
      data: {
        enrolledCourses: enrolled.rows[0]?.total || 0,
        completedCourses: completed.rows[0]?.total || 0,
        completedLessons: completedLessons.rows[0]?.total || 0
      }
    });
  }

  // Use Promise.all for parallel queries for better performance
  const [usersResult, coursesResult, ratingResult] = await Promise.all([
    // Count total users (students only)
    pool.query(`
      SELECT COUNT(*)::int as total 
      FROM users 
      WHERE role = 'student'
    `),
    
    // Count total courses
    pool.query(`
      SELECT COUNT(*)::int as total 
      FROM courses
    `),
    
    // Calculate average rating from feedback
    pool.query(`
      SELECT AVG(rating)::numeric(3,1) as average_rating
      FROM feedback
      WHERE rating IS NOT NULL
    `)
  ]);

  const totalUsers = usersResult.rows[0]?.total || 0;
  const totalCourses = coursesResult.rows[0]?.total || 0;
  const averageRating = parseFloat(ratingResult.rows[0]?.average_rating || 0);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalCourses,
      averageRating: Math.round(averageRating * 10) / 10 // Round to 1 decimal place
    }
  });
});

/**
 * GET /api/stats/detailed
 * Returns detailed dashboard statistics with additional metrics
 */
exports.getDetailedStats = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    const [
      enrolledResult,
      completedResult,
      progressResult,
      recentEnrollments
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as total FROM enrollments WHERE user_id = $1 AND is_active = true', [req.user.id]),
      pool.query('SELECT COUNT(*)::int as total FROM enrollments WHERE user_id = $1 AND completed_at IS NOT NULL', [req.user.id]),
      pool.query(
        `SELECT
           COUNT(*)::int AS total_lectures,
           COUNT(*) FILTER (WHERE up.completed = true)::int AS completed_lectures
         FROM lessons l
         JOIN enrollments e ON e.course_id = l.course_id AND e.user_id = $1 AND e.is_active = true
         LEFT JOIN user_progress up ON up.lecture_id = l.id AND up.user_id = $1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT c.id, c.title, e.enrolled_at
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.user_id = $1 AND e.is_active = true
         ORDER BY e.enrolled_at DESC
         LIMIT 5`,
        [req.user.id]
      )
    ]);

    const totalLectures = progressResult.rows[0]?.total_lectures || 0;
    const completedLectures = progressResult.rows[0]?.completed_lectures || 0;

    return res.json({
      success: true,
      data: {
        enrolledCourses: enrolledResult.rows[0]?.total || 0,
        completedCourses: completedResult.rows[0]?.total || 0,
        totalLectures,
        completedLectures,
        progressPercent: totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0,
        recentEnrollments: recentEnrollments.rows
      }
    });
  }

  const [
    usersResult,
    coursesResult,
    ratingResult,
    enrollmentsResult,
    feedbackCountResult
  ] = await Promise.all([
    // Total users
    pool.query(`
      SELECT COUNT(*)::int as total 
      FROM users 
      WHERE role = 'student'
    `),
    
    // Total courses
    pool.query(`
      SELECT COUNT(*)::int as total 
      FROM courses
    `),
    
    // Average rating
    pool.query(`
      SELECT AVG(rating)::numeric(3,1) as average_rating
      FROM feedback
      WHERE rating IS NOT NULL
    `),
    
    // Total enrollments
    pool.query(`
      SELECT COUNT(*)::int as total 
      FROM enrollments
    `),
    
    // Total feedback submissions
    pool.query(`
      SELECT COUNT(*)::int as total 
      FROM feedback
    `)
  ]);

  const totalUsers = usersResult.rows[0]?.total || 0;
  const totalCourses = coursesResult.rows[0]?.total || 0;
  const averageRating = parseFloat(ratingResult.rows[0]?.average_rating || 0);
  const totalEnrollments = enrollmentsResult.rows[0]?.total || 0;
  const totalFeedback = feedbackCountResult.rows[0]?.total || 0;

  res.json({
    success: true,
    data: {
      totalUsers,
      totalCourses,
      averageRating: Math.round(averageRating * 10) / 10,
      totalEnrollments,
      totalFeedback,
      enrollmentRate: totalUsers > 0 ? ((totalEnrollments / totalUsers) * 100).toFixed(2) : 0
    }
  });
});
