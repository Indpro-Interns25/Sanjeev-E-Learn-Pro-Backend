const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');
const Lecture = require('../models/lectureModel');
const UserProgress = require('../models/userProgressModel');
const Certificate = require('../models/certificateModel');

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

  const existingProgress = await UserProgress.getLessonProgressState(userId, lectureId);
  const resolvedWatchedTime = Math.max(existingProgress.watchedTime || 0, parseInt(watched_time, 10) || 0);
  const quizAttempted = await UserProgress.hasLessonQuizAttempt(userId, lectureId);

  if (completed && resolvedWatchedTime <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Lesson must be watched before completion'
    });
  }

  if (completed && !quizAttempted) {
    return res.status(400).json({
      success: false,
      message: 'Attempt lesson quiz before completion'
    });
  }

  const shouldComplete = quizAttempted && resolvedWatchedTime > 0 && (Boolean(completed) || existingProgress.completed);

  const progress = await UserProgress.upsertProgress({
    userId,
    courseId,
    lectureId,
    completed: shouldComplete,
    watchedTime: resolvedWatchedTime
  });

  const completion = await UserProgress.getCourseCompletion(userId, courseId);

  if (completion.completionPercentage === 100) {
    await Certificate.issueForUserCourse(userId, courseId);
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

  await pool.query(
    `UPDATE users
     SET enrolled_courses = CASE
       WHEN enrolled_courses IS NULL THEN ARRAY[$2]::integer[]
       WHEN NOT ($2 = ANY(enrolled_courses)) THEN array_append(enrolled_courses, $2)
       ELSE enrolled_courses
     END
     WHERE id = $1 AND role = 'student'`,
    [userId, courseId]
  );

  res.status(201).json({ success: true, data: enrollment.rows[0] });
});
