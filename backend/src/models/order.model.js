const db = require('../config/database');

class Order {
  constructor(order) {
    this.userId = order.userId;
    this.totalAmount = order.totalAmount;
    this.shippingAddress = order.shippingAddress;
    this.paymentMethod = order.paymentMethod;
    this.notes = order.notes;
    this.items = order.items;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT o.*, 
        u.fullName as userName,
        u.email as userEmail,
        u.phone as userPhone
       FROM orders o
       LEFT JOIN users u ON o.userId = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (rows[0]) {
      // Get order items
      const [items] = await db.execute(
        `SELECT oi.*, 
          p.name as productName,
          p.images
         FROM order_items oi
         LEFT JOIN products p ON oi.productId = p.id
         WHERE oi.orderId = ?`,
        [id]
      );

      rows[0].items = items;
    }

    return rows[0];
  }

  static async findByUserId(userId, options = {}) {
    const { status, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = `SELECT o.* FROM orders o WHERE o.userId = ?`;
    const params = [userId];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    // Get total count
    const [countResult] = await db.execute(
      query.replace('SELECT o.*', 'SELECT COUNT(*) as total'),
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    query += ` ORDER BY o.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.execute(query, params);

    // Get items for each order
    for (let order of rows) {
      const [items] = await db.execute(
        `SELECT oi.*, 
          p.name as productName,
          p.images
         FROM order_items oi
         LEFT JOIN products p ON oi.productId = p.id
         WHERE oi.orderId = ?`,
        [order.id]
      );
      order.items = items;
    }

    return {
      orders: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async save() {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Insert order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (
          userId, totalAmount, shippingAddress, 
          paymentMethod, paymentStatus, notes
        ) VALUES (?, ?, ?, ?, 'pending', ?)`,
        [
          this.userId,
          this.totalAmount,
          this.shippingAddress,
          this.paymentMethod,
          this.notes
        ]
      );

      const orderId = orderResult.insertId;

      // Insert order items
      for (const item of this.items) {
        await connection.execute(
          `INSERT INTO order_items (
            orderId, productId, quantity, price
          ) VALUES (?, ?, ?, ?)`,
          [orderId, item.productId, item.quantity, item.price]
        );

        // Update product stock
        await connection.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.productId]
        );
      }

      await connection.commit();
      return orderId;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateStatus(id, status) {
    const [result] = await db.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  static async updatePayment(id, transactionId) {
    const [result] = await db.execute(
      `UPDATE orders 
       SET paymentStatus = 'paid', transactionId = ?
       WHERE id = ?`,
      [transactionId, id]
    );
    return result.affectedRows > 0;
  }

  static async cancelOrder(id) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get order items
      const [items] = await connection.execute(
        'SELECT productId, quantity FROM order_items WHERE orderId = ?',
        [id]
      );

      // Restore product stock
      for (const item of items) {
        await connection.execute(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.productId]
        );
      }

      // Update order status
      await connection.execute(
        "UPDATE orders SET status = 'cancelled' WHERE id = ?",
        [id]
      );

      await connection.commit();
      return true;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getOrderStats(vendorId = null) {
    let query = `
      SELECT 
        COUNT(*) as totalOrders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processingOrders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shippedOrders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as deliveredOrders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledOrders,
        SUM(CASE WHEN paymentStatus = 'paid' THEN totalAmount ELSE 0 END) as totalRevenue
      FROM orders o`;

    const params = [];

    if (vendorId) {
      query += ` JOIN order_items oi ON o.id = oi.orderId
                 JOIN products p ON oi.productId = p.id
                 WHERE p.vendorId = ?`;
      params.push(vendorId);
    }

    const [rows] = await db.execute(query, params);
    return rows[0];
  }
}

module.exports = Order; 