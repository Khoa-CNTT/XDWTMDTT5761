const express = require('express');
const { body } = require('express-validator');
const productController = require('../controllers/product.controller');
const reviewController = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const productValidation = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  body('description')
    .notEmpty()
    .withMessage('Description is required'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('comparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number'),
  body('categoryId')
    .notEmpty()
    .withMessage('Category is required')
    .isInt()
    .withMessage('Invalid category'),
  body('stock')
    .notEmpty()
    .withMessage('Stock is required')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('images')
    .isArray()
    .withMessage('Images must be an array')
    .notEmpty()
    .withMessage('At least one image is required'),
  body('images.*')
    .isURL()
    .withMessage('Invalid image URL'),
  body('specifications')
    .optional()
    .isObject()
    .withMessage('Specifications must be an object')
];

const reviewValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isInt()
    .withMessage('Invalid product ID'),
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isInt()
    .withMessage('Invalid order ID'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Invalid image URL')
];

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/slug/:slug', productController.getProductBySlug);
router.get('/:productId/reviews', reviewController.getProductReviews);

// Protected routes (require authentication)
router.use(authenticate);

// Review routes
router.post('/reviews', reviewValidation, reviewController.createReview);
router.put('/reviews/:id', reviewValidation, reviewController.updateReview);
router.delete('/reviews/:id', reviewController.deleteReview);
router.get('/user/:userId/reviews', reviewController.getUserReviews);

// Vendor routes
router.post('/', authorize('vendor'), productValidation, productController.createProduct);
router.put('/:id', authorize('vendor'), productValidation, productController.updateProduct);
router.delete('/:id', authorize('vendor'), productController.deleteProduct);
router.get('/vendor/:vendorId?', authorize('vendor'), productController.getVendorProducts);
router.put('/:id/stock', authorize('vendor'), productController.updateStock);

// Admin routes
router.put('/:id/status', authorize('admin'), productController.updateStatus);

module.exports = router; 