const Enrollment = require('../models/enrollmentModel');
const asyncHandler = require('../utils/asyncHandler');

exports.enroll = asyncHandler(async (req, res) => {
  const { user_id, course_id } = req.body;
  if (!user_id || !course_id) return res.status(400).json({ error: 'user_id and course_id required' });
  const result = await Enrollment.enroll({ user_id, course_id });
  if (!result) return res.status(200).json({ message: 'Already enrolled' });
  res.status(201).json(result);
});

exports.listUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const rows = await Enrollment.listByUser(userId);
  res.json(rows);
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
