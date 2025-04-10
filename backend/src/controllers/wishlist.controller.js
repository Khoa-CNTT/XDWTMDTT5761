const Wishlist = require('../models/wishlist.model');
const { validationResult } = require('express-validator');

// Get wishlist items
exports.getWishlist = async (req, res) => {
  try {
    const result = await Wishlist.getWishlistItems(req.user.userId, {
      page: req.query.page,
      limit: req.query.limit
    });

    res.json(result);

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Add item to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.body;

    // Check if item already exists in wishlist
    const exists = await Wishlist.checkProductInWishlist(req.user.userId, productId);
    if (exists) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    const wishlistItem = new Wishlist({
      userId: req.user.userId,
      productId
    });

    await wishlistItem.save();

    res.status(201).json({
      message: 'Product added to wishlist successfully'
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove item from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if item exists in wishlist
    const exists = await Wishlist.checkProductInWishlist(req.user.userId, productId);
    if (!exists) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    await Wishlist.removeItem(req.user.userId, productId);

    res.json({
      message: 'Product removed from wishlist successfully'
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Clear wishlist
exports.clearWishlist = async (req, res) => {
  try {
    await Wishlist.clearWishlist(req.user.userId);
    
    res.json({
      message: 'Wishlist cleared successfully'
    });

  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check if product is in wishlist
exports.checkProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const isInWishlist = await Wishlist.checkProductInWishlist(req.user.userId, productId);
    
    res.json({
      isInWishlist
    });

  } catch (error) {
    console.error('Check wishlist product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 