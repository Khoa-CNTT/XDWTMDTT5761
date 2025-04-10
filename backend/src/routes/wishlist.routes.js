const express = require('express');
const { body } = require('express-validator');
const wishlistController = require('../controllers/wishlist.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const wishlistValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isInt()
    .withMessage('Invalid product ID')
];

// All wishlist routes require authentication
router.use(authenticate);

// Wishlist routes
router.get('/', wishlistController.getWishlist);
router.post('/', wishlistValidation, wishlistController.addToWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);
router.delete('/', wishlistController.clearWishlist);
router.get('/:productId/check', wishlistController.checkProduct);

module.exports = router; 