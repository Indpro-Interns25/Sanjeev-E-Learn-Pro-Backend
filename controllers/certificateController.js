const asyncHandler = require('../utils/asyncHandler');
const PDFDocument = require('pdfkit');
const pool = require('../db');
const UserProgress = require('../models/userProgressModel');

exports.downloadCertificate = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const courseId = parseInt(req.params.courseId, 10);

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required' });
  }

  const completion = await UserProgress.getCourseCompletion(userId, courseId);
  if (completion.completionPercentage < 100) {
    return res.status(400).json({
      success: false,
      message: 'Certificate is available only after 100% completion'
    });
  }

  // Quiz must be completed for this course before certificate generation.
  const quizCompletion = await pool.query(
    `SELECT 1
     FROM quiz_results qr
     LEFT JOIN quizzes q ON q.id = qr.quiz_id
     WHERE qr.user_id = $1
       AND (qr.course_id = $2 OR q.course_id = $2)
     LIMIT 1`,
    [userId, courseId]
  );

  if (quizCompletion.rows.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Certificate is available only after completing the course quiz'
    });
  }

  const userCourse = await pool.query(
    `SELECT u.name AS user_name, c.title AS course_title
     FROM users u
     JOIN courses c ON c.id = $2
     WHERE u.id = $1`,
    [userId, courseId]
  );

  if (userCourse.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'User or course not found' });
  }

  const certificateCode = `CERT-${courseId}-${userId}`;
  const certificateResult = await pool.query(
    `INSERT INTO certificates (user_id, course_id, certificate_code, issued_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, course_id)
     DO UPDATE SET issued_at = certificates.issued_at
     RETURNING id, issued_at`,
    [userId, courseId, certificateCode]
  );

  const { user_name: userName, course_title: courseTitle } = userCourse.rows[0];
  const { id: certificateId, issued_at: issuedAt } = certificateResult.rows[0];
  const completionDate = new Date(issuedAt).toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=certificate-course-${courseId}.pdf`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  doc.rect(20, 20, 555, 802).stroke('#222222');
  doc.fontSize(28).text('Certificate of Completion', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(14).text('This certifies that', { align: 'center' });
  doc.moveDown();
  doc.fontSize(24).text(userName, { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('has successfully completed the course', { align: 'center' });
  doc.moveDown();
  doc.fontSize(20).text(courseTitle, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text(`Certificate ID: CERT-${certificateId}-${courseId}-${userId}`, { align: 'center' });
  doc.text(`Completion Date: ${completionDate}`, { align: 'center' });

  doc.end();
});
