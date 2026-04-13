const axios = require('axios');
const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');

function normalizeProvider(provider) {
  const allowed = ['s3', 'cloudinary', 'external'];
  const value = (provider || 'external').toLowerCase();
  return allowed.includes(value) ? value : 'external';
}

async function ensureEnrollmentOrPrivileged(user, courseId) {
  if (user.role === 'admin' || user.role === 'instructor') {
    return true;
  }

  const enrollment = await pool.query(
    'SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
    [user.id, courseId]
  );

  return enrollment.rows.length > 0;
}

async function ensureManagePermission(user, courseId) {
  if (user.role === 'admin') return true;
  if (user.role !== 'instructor') return false;

  const owned = await pool.query('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, user.id]);
  return owned.rows.length > 0;
}

function buildRangeHeaders(contentLength, rangeHeader) {
  if (!rangeHeader) {
    return {
      statusCode: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength
      }
    };
  }

  const [startRaw, endRaw] = rangeHeader.replace(/bytes=/, '').split('-');
  const start = Number.parseInt(startRaw, 10);
  const end = endRaw ? Number.parseInt(endRaw, 10) : contentLength - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end >= contentLength || start > end) {
    return null;
  }

  return {
    statusCode: 206,
    headers: {
      'Content-Range': `bytes ${start}-${end}/${contentLength}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1
    },
    start,
    end
  };
}

exports.registerLessonVideo = asyncHandler(async (req, res) => {
  const lessonId = Number.parseInt(req.params.lessonId, 10);
  const { source_url, playback_url, provider, public_id, mime_type, metadata } = req.body;

  if (!source_url) {
    return res.status(400).json({ success: false, message: 'source_url is required' });
  }

  const lesson = await pool.query('SELECT id, course_id FROM lessons WHERE id = $1', [lessonId]);
  if (lesson.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }

  const courseId = lesson.rows[0].course_id;
  const canManage = await ensureManagePermission(req.user, courseId);
  if (!canManage) {
    return res.status(403).json({ success: false, message: 'Forbidden: cannot manage video for this course' });
  }

  const result = await pool.query(
    `INSERT INTO video_assets (lesson_id, course_id, provider, public_id, source_url, playback_url, mime_type, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
     ON CONFLICT (lesson_id)
     DO UPDATE SET
       provider = EXCLUDED.provider,
       public_id = EXCLUDED.public_id,
       source_url = EXCLUDED.source_url,
       playback_url = EXCLUDED.playback_url,
       mime_type = EXCLUDED.mime_type,
       metadata = EXCLUDED.metadata
     RETURNING *`,
    [
      lessonId,
      courseId,
      normalizeProvider(provider),
      public_id || null,
      source_url,
      playback_url || source_url,
      mime_type || 'video/mp4',
      JSON.stringify(metadata || {}),
      req.user.id
    ]
  );

  res.status(201).json({ success: true, data: result.rows[0] });
});

exports.getLessonVideoMeta = asyncHandler(async (req, res) => {
  const lessonId = Number.parseInt(req.params.lessonId, 10);
  const data = await pool.query(
    `SELECT va.id, va.lesson_id, va.course_id, va.provider, va.public_id, va.playback_url, va.mime_type, va.metadata, va.created_at
     FROM video_assets va
     WHERE va.lesson_id = $1`,
    [lessonId]
  );

  if (data.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Video metadata not found for lesson' });
  }

  const allowed = await ensureEnrollmentOrPrivileged(req.user, data.rows[0].course_id);
  if (!allowed) {
    return res.status(403).json({ success: false, message: 'Forbidden: video metadata not accessible' });
  }

  res.json({ success: true, data: data.rows[0] });
});

exports.streamLessonVideo = asyncHandler(async (req, res) => {
  const lessonId = Number.parseInt(req.params.lessonId, 10);
  const record = await pool.query(
    `SELECT va.*, l.course_id
     FROM video_assets va
     JOIN lessons l ON l.id = va.lesson_id
     WHERE va.lesson_id = $1`,
    [lessonId]
  );

  if (record.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Video not found for lesson' });
  }

  const video = record.rows[0];
  const allowed = await ensureEnrollmentOrPrivileged(req.user, video.course_id);
  if (!allowed) {
    return res.status(403).json({ success: false, message: 'Enroll in this course to stream this lesson' });
  }

  const playbackUrl = video.playback_url || video.source_url;
  const headResponse = await axios.head(playbackUrl);
  const contentLength = Number.parseInt(headResponse.headers['content-length'] || '0', 10);

  if (!contentLength) {
    const fullStream = await axios.get(playbackUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', video.mime_type || fullStream.headers['content-type'] || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    return fullStream.data.pipe(res);
  }

  const rangeDetails = buildRangeHeaders(contentLength, req.headers.range);
  if (!rangeDetails) {
    return res.status(416).json({ success: false, message: 'Requested range not satisfiable' });
  }

  const upstreamHeaders = {};
  if (req.headers.range) {
    upstreamHeaders.Range = req.headers.range;
  }

  const videoResponse = await axios.get(playbackUrl, {
    headers: upstreamHeaders,
    responseType: 'stream'
  });

  res.writeHead(rangeDetails.statusCode, {
    ...rangeDetails.headers,
    'Content-Type': video.mime_type || videoResponse.headers['content-type'] || 'video/mp4',
    'Cache-Control': 'private, no-store'
  });

  videoResponse.data.pipe(res);
});

// POST /api/video-progress
// Save or update video progress (watching time)
// Body: { lecture_id, user_id, current_time, duration, progress_percentage }
exports.saveVideoProgress = asyncHandler(async (req, res) => {
  const { lecture_id, user_id, current_time, duration, progress_percentage } = req.body;

  if (!lecture_id || !user_id || current_time === undefined) {
    return res.status(400).json({
      success: false,
      message: 'lecture_id, user_id, and current_time are required'
    });
  }

  // Verify lecture exists
  const lesson = await pool.query('SELECT id, course_id FROM lessons WHERE id = $1', [lecture_id]);
  if (lesson.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }

  const courseId = lesson.rows[0].course_id;

  // Verify user is enrolled in the course or is admin/instructor
  const isPrivileged = req.user.role === 'admin' || req.user.role === 'instructor';
  if (!isPrivileged) {
    const enrollment = await pool.query(
      'SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
      [user_id, courseId]
    );
    if (enrollment.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: not enrolled in this course' });
    }
  }

  // Save or update video progress
  const result = await pool.query(
    `INSERT INTO user_progress (user_id, lesson_id, course_id, watched_time, total_duration)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, lesson_id) 
     DO UPDATE SET watched_time = $4, total_duration = $5, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [user_id, lecture_id, courseId, current_time || 0, duration || 0]
  );

  res.json({
    success: true,
    message: 'Video progress saved',
    data: result.rows[0]
  });
});

// GET /api/video-progress/:lectureId/:userId
// Get video progress for a lecture by a user
exports.getVideoProgress = asyncHandler(async (req, res) => {
  const lectureId = parseInt(req.params.lectureId, 10);
  const userId = parseInt(req.params.userId, 10);

  if (isNaN(lectureId) || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid lectureId or userId'
    });
  }

  // Verify lecture exists
  const lesson = await pool.query('SELECT id, course_id FROM lessons WHERE id = $1', [lectureId]);
  if (lesson.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Lesson not found' });
  }

  const courseId = lesson.rows[0].course_id;

  // Verify access (user can view their own progress or admin/instructor can view any)
  const isPrivileged = req.user.role === 'admin' || req.user.role === 'instructor';
  if (!isPrivileged && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Get video progress
  const result = await pool.query(
    `SELECT user_id, lesson_id, watched_time, total_duration, completed, created_at, updated_at
     FROM user_progress
     WHERE lesson_id = $1 AND user_id = $2`,
    [lectureId, userId]
  );

  if (result.rows.length === 0) {
    return res.json({
      success: true,
      data: {
        user_id: userId,
        lesson_id: lectureId,
        watched_time: 0,
        total_duration: 0,
        completed: false
      }
    });
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});
