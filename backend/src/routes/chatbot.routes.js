const express = require('express');
const { body } = require('express-validator');
const chatbotController = require('../controllers/chatbot.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const messageValidation = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 500 })
    .withMessage('Message must not exceed 500 characters'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object')
];

const searchValidation = [
  body('query')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters')
];

const locationValidation = [
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters')
];

// Public routes
router.post('/message', messageValidation, chatbotController.sendMessage);
router.post('/search', searchValidation, chatbotController.searchProducts);
router.get('/shipping', locationValidation, chatbotController.handleShippingInquiry);

// Protected routes
router.use(authenticate);

router.get('/recommendations/:productId', chatbotController.getRecommendations);
router.get('/order/:orderId', chatbotController.handleOrderInquiry);

module.exports = router; 