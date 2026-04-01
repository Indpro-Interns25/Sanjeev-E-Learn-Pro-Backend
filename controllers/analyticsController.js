const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

exports.getPlatformAnalytics = asyncHandler(async (req, res) => {
  const [users, enrollments, completionStats, popularCourses] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total_users FROM users'),
    pool.query('SELECT COUNT(*)::int AS total_enrollments FROM enrollments WHERE is_active = true'),
    pool.query(
      `SELECT
         up.course_id,
         c.title,
         ROUND(AVG(CASE WHEN up.completed THEN 100 ELSE 0 END), 2) AS avg_completion_rate
       FROM user_progress up
       JOIN courses c ON c.id = up.course_id
       GROUP BY up.course_id, c.title
       ORDER BY avg_completion_rate DESC`
    ),
    pool.query(
      `SELECT c.id, c.title, COUNT(e.id)::int AS enrollments
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.is_active = true
       GROUP BY c.id, c.title
       ORDER BY enrollments DESC, c.id ASC
       LIMIT 10`
    )
  ]);

  res.json({
    success: true,
    data: {
      total_users: users.rows[0].total_users,
      total_enrollments: enrollments.rows[0].total_enrollments,
      completion_stats: completionStats.rows,
      most_popular_courses: popularCourses.rows
    }
  });
});
