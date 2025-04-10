const Review = require('../models/review.model');
const { validationResult } = require('express-validator');

// Get reviews by product ID
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, sort, page, limit } = req.query;

    const result = await Review.findByProductId(productId, {
      rating,
      sort,
      page,
      limit
    });

    res.json(result);

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user reviews
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;

    // Check if user has permission to view these reviews
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await Review.findByUserId(userId, {
      page: req.query.page,
      limit: req.query.limit
    });

    res.json(result);

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create review
exports.createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, orderId, rating, comment, images } = req.body;

    // Check if user has purchased the product
    const hasPurchased = await Review.checkUserPurchased(req.user.userId, productId);
    if (!hasPurchased) {
      return res.status(403).json({ message: 'You must purchase the product before reviewing' });
    }

    // Check if user has already reviewed this product
    const hasReviewed = await Review.checkUserReviewed(req.user.userId, productId);
    if (hasReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const review = new Review({
      userId: req.user.userId,
      productId,
      orderId,
      rating,
      comment,
      images
    });

    const reviewId = await review.save();
    
    res.status(201).json({
      message: 'Review created successfully',
      reviewId
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update review
exports.updateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, comment, images } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns this review
    if (review.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedReview = {
      rating: rating || review.rating,
      comment: comment || review.comment,
      images: images || review.images
    };

    const success = await Review.update(id, updatedReview);
    
    if (success) {
      res.json({ message: 'Review updated successfully' });
    } else {
      res.status(400).json({ message: 'Failed to update review' });
    }

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns this review or is admin
    if (review.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const success = await Review.delete(id);
    
    if (success) {
      res.json({ message: 'Review deleted successfully' });
    } else {
      res.status(400).json({ message: 'Failed to delete review' });
    }

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 