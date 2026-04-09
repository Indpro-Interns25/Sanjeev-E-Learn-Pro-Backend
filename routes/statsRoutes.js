const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { validateToken } = require('../middleware/authMiddleware');

// GET /api/stats - Get basic dashboard statistics
router.get('/', statsController.getPublicStats);

// GET /api/stats/detailed - Get detailed dashboard statistics
router.get('/detailed', validateToken, statsController.getDetailedStats);

module.exports = router;
