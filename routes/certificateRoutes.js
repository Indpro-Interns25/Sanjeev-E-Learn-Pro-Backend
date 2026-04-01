const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { validateToken } = require('../middleware/authMiddleware');
const { requireEnrollment } = require('../middleware/rbacMiddleware');

router.get('/:courseId', validateToken, requireEnrollment, certificateController.downloadCertificate);
router.get('/courses/:courseId/certificate', validateToken, requireEnrollment, certificateController.downloadCertificate);

module.exports = router;
