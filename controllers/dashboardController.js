const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');

// Get dashboard statistics for a user
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.params.userId || req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Get courses in progress (enrolled but not completed)
    const coursesInProgressQuery = `
      SELECT COUNT(DISTINCT ce.course_id) as count
      FROM course_enrollments ce
      WHERE ce.user_id = $1 
      AND ce.is_active = true
      AND ce.completed_at IS NULL
    `;
    const coursesInProgress = await pool.query(coursesInProgressQuery, [userId]);

    // Get completed courses
    const completedCoursesQuery = `
      SELECT COUNT(DISTINCT ce.course_id) as count
      FROM course_enrollments ce
      WHERE ce.user_id = $1 
      AND ce.completed_at IS NOT NULL
    `;
    const completedCourses = await pool.query(completedCoursesQuery, [userId]);

    // Get total lessons across all enrolled courses
    const totalLessonsQuery = `
      SELECT COUNT(DISTINCT cl.id) as count
      FROM course_lessons cl
      INNER JOIN course_enrollments ce ON cl.course_id = ce.course_id
      WHERE ce.user_id = $1 AND ce.is_active = true
    `;
    const totalLessons = await pool.query(totalLessonsQuery, [userId]);

    // Get completed lessons
    const completedLessonsQuery = `
      SELECT COUNT(*) as count
      FROM lesson_progress lp
      WHERE lp.user_id = $1 
      AND lp.is_completed = true
    `;
    const completedLessons = await pool.query(completedLessonsQuery, [userId]);

    // Get user's enrolled courses with progress
    const userCoursesQuery = `
      SELECT 
        c.id,
        c.title,
        c.description,
        c.thumbnail,
        c.instructor_id,
        ce.enrolled_at,
        ce.progress,
        ce.completed_at,
        CASE 
          WHEN ce.completed_at IS NOT NULL THEN 'completed'
          WHEN ce.progress > 0 THEN 'in_progress'
          ELSE 'not_started'
        END as status,
        (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) as total_lessons,
        (SELECT COUNT(*) FROM lesson_progress lp 
         INNER JOIN course_lessons cl ON lp.lesson_id = cl.id 
         WHERE cl.course_id = c.id AND lp.user_id = ce.user_id AND lp.is_completed = true) as completed_lessons
      FROM courses c
      INNER JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE ce.user_id = $1 AND ce.is_active = true
      ORDER BY 
        CASE 
          WHEN ce.completed_at IS NOT NULL THEN 2
          WHEN ce.progress > 0 THEN 0  
          ELSE 1
        END,
        ce.enrolled_at DESC
    `;
    const userCourses = await pool.query(userCoursesQuery, [userId]);

    const dashboardData = {
      stats: {
        coursesInProgress: parseInt(coursesInProgress.rows[0]?.count || 0),
        completedCourses: parseInt(completedCourses.rows[0]?.count || 0),
        totalLessons: parseInt(totalLessons.rows[0]?.count || 0),
        completedLessons: parseInt(completedLessons.rows[0]?.count || 0)
      },
      courses: userCourses.rows.map(course => ({
        ...course,
        progress_percentage: course.total_lessons > 0 
          ? Math.round((course.completed_lessons / course.total_lessons) * 100)
          : 0
      }))
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get recent activity for dashboard
exports.getRecentActivity = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.params.userId || req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const recentActivityQuery = `
      SELECT 
        'lesson_completed' as activity_type,
        lp.completed_at as activity_date,
        cl.title as lesson_title,
        c.title as course_title,
        c.id as course_id
      FROM lesson_progress lp
      INNER JOIN course_lessons cl ON lp.lesson_id = cl.id
      INNER JOIN courses c ON cl.course_id = c.id
      WHERE lp.user_id = $1 AND lp.is_completed = true
      
      UNION ALL
      
      SELECT 
        'course_enrolled' as activity_type,
        ce.enrolled_at as activity_date,
        null as lesson_title,
        c.title as course_title,
        c.id as course_id
      FROM course_enrollments ce
      INNER JOIN courses c ON ce.course_id = c.id
      WHERE ce.user_id = $1
      
      ORDER BY activity_date DESC
      LIMIT 10
    `;

    const recentActivity = await pool.query(recentActivityQuery, [userId]);
    res.json(recentActivity.rows);

  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Get course progress details
exports.getCourseProgress = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.query.userId;
  const courseId = req.params.courseId;
  
  if (!userId || !courseId) {
    return res.status(400).json({ error: 'User ID and Course ID are required' });
  }

  try {
    const courseProgressQuery = `
      SELECT 
        c.id as course_id,
        c.title as course_title,
        cl.id as lesson_id,
        cl.title as lesson_title,
        cl.order_sequence,
        COALESCE(lp.is_completed, false) as is_completed,
        lp.completed_at,
        lp.watch_time
      FROM courses c
      INNER JOIN course_lessons cl ON c.id = cl.course_id
      LEFT JOIN lesson_progress lp ON cl.id = lp.lesson_id AND lp.user_id = $1
      WHERE c.id = $2
      ORDER BY cl.order_sequence, cl.id
    `;

    const courseProgress = await pool.query(courseProgressQuery, [userId, courseId]);
    
    const lessons = courseProgress.rows;
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(lesson => lesson.is_completed).length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    res.json({
      courseId: parseInt(courseId),
      totalLessons,
      completedLessons,
      progressPercentage,
      lessons
    });

  } catch (error) {
    console.error('Course progress error:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});