const express = require('express');
const { body } = require('express-validator');
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const categoryValidation = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),
  body('parentId')
    .optional()
    .isInt()
    .withMessage('Invalid parent category ID'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
];

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/:id', categoryController.getCategoryById);
router.get('/slug/:slug', categoryController.getCategoryBySlug);

// Protected routes (require authentication)
router.use(authenticate);

// Admin only routes
router.post('/', authorize('admin'), categoryValidation, categoryController.createCategory);
router.put('/:id', authorize('admin'), categoryValidation, categoryController.updateCategory);
router.delete('/:id', authorize('admin'), categoryController.deleteCategory);
router.put('/:id/order', authorize('admin'), categoryController.updateOrder);
router.put('/:id/status', authorize('admin'), categoryController.updateStatus);

module.exports = router; 