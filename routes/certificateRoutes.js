const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { validateToken } = require('../middleware/authMiddleware');

router.post('/generate', validateToken, certificateController.generateCertificate);
router.get('/user/:userId', validateToken, certificateController.getUserCertificates);
router.get('/:courseId/download', validateToken, certificateController.downloadCertificatePdf);
router.get('/:userId/:courseId', validateToken, certificateController.getCertificateByUserAndCourse);

// Backward-compatible aliases
router.get('/courses/:courseId/certificate', validateToken, certificateController.downloadCertificatePdf);
router.get('/:courseId', validateToken, certificateController.getCertificateByCourse);

module.exports = router;
