const express = require('express');
const { body } = require('express-validator');
const orderController = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const orderValidation = [
  body('shippingAddress')
    .notEmpty()
    .withMessage('Shipping address is required'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['paypal', 'bank_transfer'])
    .withMessage('Invalid payment method'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

const paymentValidation = [
  body('transactionId')
    .notEmpty()
    .withMessage('Transaction ID is required')
];

// All order routes require authentication
router.use(authenticate);

// Order routes
router.get('/', orderController.getUserOrders);
router.get('/stats', authorize(['admin', 'vendor']), orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);
router.post('/', orderValidation, orderController.createOrder);
router.put('/:id/status', authorize('admin'), orderController.updateOrderStatus);
router.put('/:id/payment', paymentValidation, orderController.updatePayment);
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router; 