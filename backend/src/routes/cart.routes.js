const express = require('express');
const { body } = require('express-validator');
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const cartValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isInt()
    .withMessage('Invalid product ID'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1')
];

// All cart routes require authentication
router.use(authenticate);

// Cart routes
router.get('/', cartController.getCart);
router.post('/', cartValidation, cartController.addToCart);
router.put('/', cartValidation, cartController.updateQuantity);
router.delete('/:productId', cartController.removeFromCart);
router.delete('/', cartController.clearCart);
router.get('/validate', cartController.validateCart);

module.exports = router; 