const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../db');

function getToken(socket) {
  const header = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
  if (!header) return null;
  if (header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return header;
}

async function persistCourseMessage({ senderId, courseId, message }) {
  const result = await pool.query(
    `INSERT INTO chat_messages (sender_id, course_id, room_type, message)
     VALUES ($1, $2, 'course', $3)
     RETURNING id, sender_id, course_id, message, created_at`,
    [senderId, courseId, message]
  );
  return result.rows[0];
}

async function persistPrivateMessage({ senderId, recipientId, message }) {
  const result = await pool.query(
    `INSERT INTO chat_messages (sender_id, recipient_id, room_type, message)
     VALUES ($1, $2, 'private', $3)
     RETURNING id, sender_id, recipient_id, message, created_at`,
    [senderId, recipientId, message]
  );
  return result.rows[0];
}

async function joinLiveClass({ liveClassId, userId, role }) {
  await pool.query(
    `INSERT INTO live_class_participants (live_class_id, user_id, role, joined_at, left_at)
     VALUES ($1, $2, $3, NOW(), NULL)
     ON CONFLICT (live_class_id, user_id)
     DO UPDATE SET role = EXCLUDED.role, joined_at = NOW(), left_at = NULL`,
    [liveClassId, userId, role]
  );
}

async function leaveLiveClass({ liveClassId, userId }) {
  await pool.query(
    `UPDATE live_class_participants
     SET left_at = NOW()
     WHERE live_class_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [liveClassId, userId]
  );
}

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = getToken(socket);
      if (!token) return next(new Error('Authentication token missing'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
      if (user.rows.length === 0) return next(new Error('Invalid user'));

      socket.user = user.rows[0];
      socket.join(`user-${socket.user.id}`);
      return next();
    } catch (error) {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-course', async (courseId) => {
      const parsedCourseId = Number.parseInt(courseId, 10);
      if (Number.isNaN(parsedCourseId)) return;
      socket.join(`course-${parsedCourseId}`);
      socket.emit('joined-course', { courseId: parsedCourseId });
    });

    socket.on('leave-course', (courseId) => {
      const parsedCourseId = Number.parseInt(courseId, 10);
      if (Number.isNaN(parsedCourseId)) return;
      socket.leave(`course-${parsedCourseId}`);
    });

    socket.on('chat-message', async (data) => {
      const courseId = Number.parseInt(data?.courseId, 10);
      const message = (data?.message || '').trim();
      if (!courseId || !message) return;

      const saved = await persistCourseMessage({
        senderId: socket.user.id,
        courseId,
        message
      });

      io.to(`course-${courseId}`).emit('chat-message', {
        ...saved,
        sender: {
          id: socket.user.id,
          name: socket.user.name,
          role: socket.user.role
        }
      });
    });

    socket.on('private-message', async (data) => {
      const recipientId = Number.parseInt(data?.recipientId, 10);
      const message = (data?.message || '').trim();
      if (!recipientId || !message) return;

      const saved = await persistPrivateMessage({
        senderId: socket.user.id,
        recipientId,
        message
      });

      const payload = {
        ...saved,
        sender: {
          id: socket.user.id,
          name: socket.user.name,
          role: socket.user.role
        }
      };

      io.to(`user-${recipientId}`).emit('private-message', payload);
      socket.emit('private-message', payload);
    });

    socket.on('live-class:join', async (data) => {
      const liveClassId = Number.parseInt(data?.liveClassId, 10);
      if (!liveClassId) return;

      await joinLiveClass({
        liveClassId,
        userId: socket.user.id,
        role: socket.user.role
      });

      socket.join(`live-${liveClassId}`);
      io.to(`live-${liveClassId}`).emit('live-class:participant-joined', {
        liveClassId,
        user: {
          id: socket.user.id,
          name: socket.user.name,
          role: socket.user.role
        }
      });
    });

    socket.on('live-class:leave', async (data) => {
      const liveClassId = Number.parseInt(data?.liveClassId, 10);
      if (!liveClassId) return;

      await leaveLiveClass({ liveClassId, userId: socket.user.id });
      socket.leave(`live-${liveClassId}`);
      io.to(`live-${liveClassId}`).emit('live-class:participant-left', {
        liveClassId,
        userId: socket.user.id
      });
    });

    socket.on('webrtc:signal', (data) => {
      const liveClassId = Number.parseInt(data?.liveClassId, 10);
      const targetSocketId = data?.targetSocketId;
      if (!liveClassId) return;

      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:signal', {
          liveClassId,
          fromSocketId: socket.id,
          fromUserId: socket.user.id,
          signal: data.signal
        });
        return;
      }

      socket.to(`live-${liveClassId}`).emit('webrtc:signal', {
        liveClassId,
        fromSocketId: socket.id,
        fromUserId: socket.user.id,
        signal: data.signal
      });
    });

    socket.on('notification:send', async (data) => {
      const userId = Number.parseInt(data?.userId, 10);
      const type = data?.type;
      const title = data?.title;
      const message = data?.message;
      const payload = data?.payload || {};
      if (!userId || !type || !title || !message) return;

      const row = await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING *`,
        [userId, type, title, message, JSON.stringify(payload)]
      );

      io.to(`user-${userId}`).emit('notification:new', row.rows[0]);
    });

    socket.on('disconnect', async () => {
      await pool.query(
        `UPDATE live_class_participants
         SET left_at = NOW()
         WHERE user_id = $1 AND left_at IS NULL`,
        [socket.user.id]
      );
    });
  });

  return io;
}

module.exports = {
  initializeSocket
};
