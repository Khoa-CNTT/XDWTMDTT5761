const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const { validationResult } = require('express-validator');

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const userId = req.params.userId || req.user.userId;

    // Check if user has permission to view these orders
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await Order.findByUserId(userId, {
      status,
      page,
      limit
    });

    res.json(result);

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has permission to view this order
    if (order.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create order
exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shippingAddress, paymentMethod, notes } = req.body;

    // Validate cart
    const invalidItems = await Cart.validateStock(req.user.userId);
    if (invalidItems.length > 0) {
      return res.status(400).json({
        message: 'Some items in your cart are no longer available or have insufficient stock',
        invalidItems
      });
    }

    // Get cart items
    const cartItems = await Cart.getCartItems(req.user.userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total amount
    const totalAmount = await Cart.getCartTotal(req.user.userId);

    // Create order items array
    const items = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    }));

    // Create order
    const order = new Order({
      userId: req.user.userId,
      totalAmount,
      shippingAddress,
      paymentMethod,
      notes,
      items
    });

    const orderId = await order.save();

    // Clear cart after successful order creation
    await Cart.clearCart(req.user.userId);

    res.status(201).json({
      message: 'Order created successfully',
      orderId
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update order status (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status === 'cancelled') {
      await Order.cancelOrder(id);
    } else {
      await Order.updateStatus(id, status);
    }

    res.json({ message: 'Order status updated successfully' });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update payment status
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has permission
    if (order.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Order.updatePayment(id, transactionId);

    res.json({ message: 'Payment status updated successfully' });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has permission
    if (order.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if order can be cancelled
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled' });
    }

    await Order.cancelOrder(id);

    res.json({ message: 'Order cancelled successfully' });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get order statistics (Admin/Vendor)
exports.getOrderStats = async (req, res) => {
  try {
    const vendorId = req.user.role === 'vendor' ? req.user.userId : null;
    const stats = await Order.getOrderStats(vendorId);
    
    res.json(stats);

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 