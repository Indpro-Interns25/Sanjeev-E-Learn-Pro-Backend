const asyncHandler = require('../utils/asyncHandler');
const PDFDocument = require('pdfkit');
const Certificate = require('../models/certificateModel');

function courseIdFromRequest(req) {
  return parseInt(req.params.courseId || req.body.courseId, 10);
}

function canAccessUserCertificates(req, userId) {
  return req.user.role === 'admin' || req.user.id === userId;
}

exports.generateCertificate = asyncHandler(async (req, res) => {
  const courseId = courseIdFromRequest(req);

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required' });
  }

  const certificate = await Certificate.issueForUserCourse(req.user.id, courseId);
  if (!certificate) {
    return res.status(403).json({
      success: false,
      message: 'Certificate can only be generated after full course completion'
    });
  }

  res.status(201).json({ success: true, data: certificate });
});

exports.getUserCertificates = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Valid userId is required' });
  }

  if (!canAccessUserCertificates(req, userId)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const certificates = await Certificate.findByUser(userId);
  res.json({ success: true, data: certificates });
});

exports.getCertificateByCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required' });
  }

  const certificate = await Certificate.issueForUserCourse(req.user.id, courseId);
  if (!certificate) {
    return res.status(403).json({
      success: false,
      message: 'Certificate is available only after completing the course'
    });
  }

  res.json({ success: true, data: certificate });
});

exports.downloadCertificatePdf = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);

  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ success: false, message: 'Valid courseId is required' });
  }

  const certificate = await Certificate.issueForUserCourse(req.user.id, courseId);
  if (!certificate) {
    return res.status(403).json({
      success: false,
      message: 'Certificate is available only after completing the course'
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=certificate-${courseId}.pdf`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  doc.rect(20, 20, 555, 802).stroke('#222222');
  doc.fontSize(28).text('Certificate of Completion', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(14).text('This certifies that', { align: 'center' });
  doc.moveDown();
  doc.fontSize(24).text(certificate.userName, { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('has successfully completed the course', { align: 'center' });
  doc.moveDown();
  doc.fontSize(20).text(certificate.courseName, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text(`Certificate ID: ${certificate.certificateId}`, { align: 'center' });
  doc.text(`Issued Date: ${new Date(certificate.issuedDate).toISOString().slice(0, 10)}`, { align: 'center' });

  doc.end();
});