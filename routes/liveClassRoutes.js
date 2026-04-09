const express = require('express');
const router = express.Router();
const liveClassController = require('../controllers/liveClassController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

router.get('/', validateToken, liveClassController.listSessions);
router.get('/:id/participants', validateToken, liveClassController.getParticipants);
router.post('/start', validateToken, allowRoles('admin', 'instructor'), liveClassController.startSession);
router.post('/:id/end', validateToken, allowRoles('admin', 'instructor'), liveClassController.endSession);

module.exports = router;
