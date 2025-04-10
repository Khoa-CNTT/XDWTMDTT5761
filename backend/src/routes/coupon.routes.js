const express = require('express');
const { body } = require('express-validator');
const couponController = require('../controllers/coupon.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const couponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Coupon code must be between 3 and 50 characters')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Coupon code can only contain letters, numbers, underscores and hyphens'),
  body('type')
    .notEmpty()
    .withMessage('Coupon type is required')
    .isIn(['percentage', 'fixed'])
    .withMessage('Invalid coupon type'),
  body('value')
    .notEmpty()
    .withMessage('Coupon value is required')
    .isFloat({ min: 0 })
    .withMessage('Coupon value must be a positive number')
    .custom((value, { req }) => {
      if (req.body.type === 'percentage' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      return true;
    }),
  body('minPurchase')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum purchase amount must be a positive number'),
  body('maxDiscount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum discount must be a positive number'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('usageLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usage limit must be a positive integer')
];

const validateCouponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Coupon code is required'),
  body('totalAmount')
    .notEmpty()
    .withMessage('Total amount is required')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number')
];

// Public routes
router.post('/validate', validateCouponValidation, couponController.validateCoupon);

// Admin routes
router.use(authenticate, authorize('admin'));

router.get('/', couponController.getAllCoupons);
router.post('/', couponValidation, couponController.createCoupon);
router.put('/:id', couponValidation, couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router; 