const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

async function tableExists(tableName) {
  const result = await pool.query('SELECT to_regclass($1) AS exists', [tableName]);
  return Boolean(result.rows[0]?.exists);
}

exports.getPlatformAnalytics = asyncHandler(async (req, res) => {
  const [users, activeUsers, enrollments, completionStats, popularCourses, recentActivity] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total_users FROM users'),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int AS active_users
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '30 days' AND user_id IS NOT NULL
    `),
    pool.query('SELECT COALESCE(SUM(COALESCE(array_length(enrolled_courses, 1), 0)), 0)::int AS total_enrollments FROM users'),
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
    ),
    pool.query(
      `SELECT action, COUNT(*)::int AS count
       FROM activity_logs
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY action
       ORDER BY count DESC
       LIMIT 10`
    )
  ]);

  let revenue = {
    total_revenue: 0,
    monthly_revenue: 0
  };

  if (await tableExists('payments')) {
    const revenueResult = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0)::numeric(12,2) AS total_revenue,
         COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN amount ELSE 0 END), 0)::numeric(12,2) AS monthly_revenue
       FROM payments
       WHERE status IN ('success', 'completed', 'paid')`
    );
    revenue = revenueResult.rows[0] || revenue;
  }

  res.json({
    success: true,
    data: {
      total_users: users.rows[0].total_users,
      active_users_last_30_days: activeUsers.rows[0]?.active_users || 0,
      total_enrollments: enrollments.rows[0].total_enrollments,
      revenue,
      completion_stats: completionStats.rows,
      most_popular_courses: popularCourses.rows,
      recent_activity: recentActivity.rows
    }
  });
});
