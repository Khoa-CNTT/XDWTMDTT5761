const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const profileValidation = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('address').optional()
];

const passwordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Public routes
router.get('/:id', userController.getUserById);

// Protected routes (require authentication)
router.use(authenticate);

// User profile routes
router.put('/profile', profileValidation, userController.updateProfile);
router.put('/change-password', passwordValidation, userController.changePassword);

// Admin only routes
router.get('/', authorize('admin'), userController.getAllUsers);
router.put('/:userId/status', authorize('admin'), userController.updateUserStatus);
router.put('/:userId/role', authorize('admin'), userController.updateUserRole);
router.delete('/:userId', authorize('admin'), userController.deleteUser);

module.exports = router; 