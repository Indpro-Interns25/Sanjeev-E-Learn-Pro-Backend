const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');
const Lecture = require('../models/lectureModel');
const UserProgress = require('../models/userProgressModel');

exports.getCourseLectures = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user.id;

  const lectures = await Lecture.findByCourse(courseId);
  const completedIds = await UserProgress.findCompletedLectureIds(userId, courseId);
  const completedSet = new Set(completedIds);

  const payload = lectures.map((lecture, index) => {
    if (index === 0) {
      return { ...lecture, is_locked: false, is_completed: completedSet.has(lecture.id) };
    }

    const prevLecture = lectures[index - 1];
    const isLocked = !completedSet.has(prevLecture.id);

    return {
      ...lecture,
      is_locked: isLocked,
      is_completed: completedSet.has(lecture.id)
    };
  });

  res.json({ success: true, data: payload });
});

exports.saveLectureProgress = asyncHandler(async (req, res) => {
  const lectureId = parseInt(req.params.lectureId, 10);
  const userId = req.user.id;
  const { watched_time = 0, completed = false } = req.body;

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return res.status(404).json({ success: false, message: 'Lecture not found' });
  }

  const courseId = lecture.course_id;

  const lectures = await Lecture.findByCourse(courseId);
  const currentIndex = lectures.findIndex((item) => item.id === lectureId);
  if (currentIndex === -1) {
    return res.status(404).json({ success: false, message: 'Lecture not found in course' });
  }

  if (completed && currentIndex > 0) {
    const previousLectureId = lectures[currentIndex - 1].id;
    const completedIds = await UserProgress.findCompletedLectureIds(userId, courseId);
    if (!completedIds.includes(previousLectureId)) {
      return res.status(400).json({
        success: false,
        message: 'Complete the previous lecture before unlocking this lecture'
      });
    }
  }

  const progress = await UserProgress.upsertProgress({
    userId,
    courseId,
    lectureId,
    completed: Boolean(completed),
    watchedTime: parseInt(watched_time, 10) || 0
  });

  const completion = await UserProgress.getCourseCompletion(userId, courseId);

  if (completion.completionPercentage === 100) {
    await pool.query(
      `INSERT INTO certificates (user_id, course_id, certificate_code, issued_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [userId, courseId, `CERT-${courseId}-${userId}`]
    );
  }

  res.json({
    success: true,
    data: {
      progress,
      completion
    }
  });
});

exports.getCourseCompletion = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user.id;

  const completion = await UserProgress.getCourseCompletion(userId, courseId);

  res.json({ success: true, data: completion });
});

exports.enrollInCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user.id;

  const course = await pool.query('SELECT id, title FROM courses WHERE id = $1', [courseId]);
  if (course.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  const enrollment = await pool.query(
    `INSERT INTO enrollments (user_id, course_id, is_active, enrolled_at)
     VALUES ($1, $2, true, NOW())
     ON CONFLICT (user_id, course_id)
     DO UPDATE SET is_active = true
     RETURNING *`,
    [userId, courseId]
  );

  res.status(201).json({ success: true, data: enrollment.rows[0] });
});
