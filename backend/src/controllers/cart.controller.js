const Cart = require('../models/cart.model');
const { validationResult } = require('express-validator');

// Get cart items
exports.getCart = async (req, res) => {
  try {
    const cartItems = await Cart.getCartItems(req.user.userId);
    const total = await Cart.getCartTotal(req.user.userId);

    res.json({
      items: cartItems,
      total
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;

    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const cartItem = new Cart({
      userId: req.user.userId,
      productId,
      quantity
    });

    await cartItem.save();

    // Get updated cart
    const cartItems = await Cart.getCartItems(req.user.userId);
    const total = await Cart.getCartTotal(req.user.userId);

    res.json({
      message: 'Item added to cart successfully',
      cart: {
        items: cartItems,
        total
      }
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update cart item quantity
exports.updateQuantity = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;

    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Check if item exists in cart
    const cartItem = await Cart.findCartItem(req.user.userId, productId);
    if (!cartItem) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    await Cart.updateQuantity(req.user.userId, productId, quantity);

    // Get updated cart
    const cartItems = await Cart.getCartItems(req.user.userId);
    const total = await Cart.getCartTotal(req.user.userId);

    res.json({
      message: 'Cart updated successfully',
      cart: {
        items: cartItems,
        total
      }
    });

  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if item exists in cart
    const cartItem = await Cart.findCartItem(req.user.userId, productId);
    if (!cartItem) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    await Cart.removeItem(req.user.userId, productId);

    // Get updated cart
    const cartItems = await Cart.getCartItems(req.user.userId);
    const total = await Cart.getCartTotal(req.user.userId);

    res.json({
      message: 'Item removed from cart successfully',
      cart: {
        items: cartItems,
        total
      }
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.clearCart(req.user.userId);
    
    res.json({
      message: 'Cart cleared successfully',
      cart: {
        items: [],
        total: 0
      }
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Validate cart before checkout
exports.validateCart = async (req, res) => {
  try {
    const invalidItems = await Cart.validateStock(req.user.userId);
    
    if (invalidItems.length > 0) {
      return res.status(400).json({
        message: 'Some items in your cart are no longer available or have insufficient stock',
        invalidItems
      });
    }

    const cartItems = await Cart.getCartItems(req.user.userId);
    const total = await Cart.getCartTotal(req.user.userId);

    res.json({
      message: 'Cart is valid',
      cart: {
        items: cartItems,
        total
      }
    });

  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 