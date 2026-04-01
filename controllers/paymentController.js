const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

// POST /api/payments/orders - Create a payment order
exports.createOrder = asyncHandler(async (req, res) => {
  const { user_id, course_id, amount, currency = 'INR' } = req.body;

  if (!user_id || !course_id || !amount) {
    return res.status(400).json({ error: 'user_id, course_id, and amount are required' });
  }

  // Verify course exists
  const course = await pool.query('SELECT id, title, price FROM courses WHERE id = $1', [course_id]);
  if (course.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  // Create a pending payment record
  const order = await pool.query(
    `INSERT INTO payments (user_id, course_id, amount, currency, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW()) RETURNING *`,
    [user_id, course_id, amount, currency]
  );

  res.status(201).json({
    success: true,
    data: {
      order_id: order.rows[0].id,
      user_id,
      course_id,
      amount,
      currency,
      status: 'pending'
    },
    message: 'Payment order created successfully'
  });
});

// POST /api/payments/verify - Verify a payment
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { order_id, payment_id, signature } = req.body;

  if (!order_id || !payment_id) {
    return res.status(400).json({ error: 'order_id and payment_id are required' });
  }

  const payment = await pool.query('SELECT * FROM payments WHERE id = $1', [order_id]);
  if (payment.rows.length === 0) {
    return res.status(404).json({ error: 'Payment order not found' });
  }

  // Mark payment as completed
  const updated = await pool.query(
    `UPDATE payments SET status = 'completed', payment_id = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [payment_id, order_id]
  );

  // Auto-enroll user in the course after successful payment
  const p = updated.rows[0];
  await pool.query(
    `INSERT INTO enrollments (user_id, course_id, enrolled_at, is_active)
     VALUES ($1, $2, NOW(), true)
     ON CONFLICT (user_id, course_id) DO UPDATE SET is_active = true`,
    [p.user_id, p.course_id]
  );

  res.json({
    success: true,
    data: updated.rows[0],
    message: 'Payment verified and enrollment activated'
  });
});
