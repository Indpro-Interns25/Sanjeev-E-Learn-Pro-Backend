const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// POST /api/payments/orders - Create a payment order
router.post('/orders', paymentController.createOrder);

// POST /api/payments/verify - Verify a payment
router.post('/verify', paymentController.verifyPayment);

module.exports = router;
