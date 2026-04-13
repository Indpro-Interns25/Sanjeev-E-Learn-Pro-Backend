const { randomUUID } = require('crypto');
const pool = require('../db');
const UserProgress = require('./userProgressModel');

function mapCertificateRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    certificateId: row.certificate_code,
    issuedDate: row.issued_at,
    userName: row.user_name,
    courseName: row.course_name
  };
}

class CertificateModel {
  static async getCompletionContext(userId, courseId) {
    const { rows } = await pool.query(
      `SELECT
         u.name AS user_name,
         c.title AS course_name,
         EXISTS (
           SELECT 1
           FROM enrollments e
           WHERE e.user_id = $1
             AND e.course_id = $2
             AND e.is_active = true
         ) AS is_enrolled
       FROM users u
       JOIN courses c ON c.id = $2
       WHERE u.id = $1`,
      [userId, courseId]
    );

    return rows[0] || null;
  }

  static async findByUserCourse(userId, courseId) {
    const { rows } = await pool.query(
      `SELECT
         ce.id,
         ce.user_id,
         ce.course_id,
         ce.certificate_code,
         ce.issued_at,
         u.name AS user_name,
         c.title AS course_name
       FROM certificates ce
       JOIN users u ON u.id = ce.user_id
       JOIN courses c ON c.id = ce.course_id
       WHERE ce.user_id = $1 AND ce.course_id = $2
       LIMIT 1`,
      [userId, courseId]
    );

    return mapCertificateRow(rows[0]);
  }

  static async findByUser(userId) {
    const { rows } = await pool.query(
      `SELECT
         ce.id,
         ce.user_id,
         ce.course_id,
         ce.certificate_code,
         ce.issued_at,
         u.name AS user_name,
         c.title AS course_name
       FROM certificates ce
       JOIN users u ON u.id = ce.user_id
       JOIN courses c ON c.id = ce.course_id
       WHERE ce.user_id = $1
       ORDER BY ce.issued_at DESC, ce.id DESC`,
      [userId]
    );

    return rows.map(mapCertificateRow);
  }

  static async issueForUserCourse(userId, courseId) {
    const completion = await UserProgress.getCourseCompletion(userId, courseId);
    if (completion.completionPercentage < 100) {
      return null;
    }

    const context = await this.getCompletionContext(userId, courseId);
    if (!context || !context.is_enrolled) {
      return null;
    }

    const existing = await this.findByUserCourse(userId, courseId);
    if (existing) {
      await pool.query(
        `UPDATE enrollments
         SET completed_at = COALESCE(completed_at, NOW())
         WHERE user_id = $1 AND course_id = $2 AND is_active = true`,
        [userId, courseId]
      );

      return existing;
    }

    const certificateCode = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO certificates (user_id, course_id, certificate_code, issued_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, course_id)
       DO NOTHING
       RETURNING id, user_id, course_id, certificate_code, issued_at`,
      [userId, courseId, certificateCode]
    );

    const certificate = mapCertificateRow(rows[0]) || (await this.findByUserCourse(userId, courseId));

    await pool.query(
      `UPDATE enrollments
       SET completed_at = COALESCE(completed_at, NOW())
       WHERE user_id = $1 AND course_id = $2 AND is_active = true`,
      [userId, courseId]
    );

    return {
      ...certificate,
      userName: context.user_name,
      courseName: context.course_name
    };
  }
}

module.exports = CertificateModel;