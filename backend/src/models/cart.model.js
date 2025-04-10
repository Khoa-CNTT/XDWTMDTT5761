const db = require('../config/database');

class Cart {
  constructor(cartItem) {
    this.userId = cartItem.userId;
    this.productId = cartItem.productId;
    this.quantity = cartItem.quantity;
  }

  static async getCartItems(userId) {
    const [rows] = await db.execute(
      `SELECT ci.*, 
        p.name as productName,
        p.price,
        p.images,
        p.stock,
        p.status
       FROM cart_items ci
       LEFT JOIN products p ON ci.productId = p.id
       WHERE ci.userId = ?`,
      [userId]
    );
    return rows;
  }

  static async findCartItem(userId, productId) {
    const [rows] = await db.execute(
      'SELECT * FROM cart_items WHERE userId = ? AND productId = ?',
      [userId, productId]
    );
    return rows[0];
  }

  async save() {
    // Check if item already exists in cart
    const existingItem = await Cart.findCartItem(this.userId, this.productId);

    if (existingItem) {
      // Update quantity
      const [result] = await db.execute(
        'UPDATE cart_items SET quantity = quantity + ? WHERE userId = ? AND productId = ?',
        [this.quantity, this.userId, this.productId]
      );
      return result.affectedRows > 0;
    } else {
      // Insert new item
      const [result] = await db.execute(
        'INSERT INTO cart_items (userId, productId, quantity) VALUES (?, ?, ?)',
        [this.userId, this.productId, this.quantity]
      );
      return result.insertId;
    }
  }

  static async updateQuantity(userId, productId, quantity) {
    const [result] = await db.execute(
      'UPDATE cart_items SET quantity = ? WHERE userId = ? AND productId = ?',
      [quantity, userId, productId]
    );
    return result.affectedRows > 0;
  }

  static async removeItem(userId, productId) {
    const [result] = await db.execute(
      'DELETE FROM cart_items WHERE userId = ? AND productId = ?',
      [userId, productId]
    );
    return result.affectedRows > 0;
  }

  static async clearCart(userId) {
    const [result] = await db.execute(
      'DELETE FROM cart_items WHERE userId = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  static async getCartTotal(userId) {
    const [rows] = await db.execute(
      `SELECT SUM(ci.quantity * p.price) as total
       FROM cart_items ci
       LEFT JOIN products p ON ci.productId = p.id
       WHERE ci.userId = ?`,
      [userId]
    );
    return rows[0].total || 0;
  }

  static async validateStock(userId) {
    const [rows] = await db.execute(
      `SELECT ci.productId, ci.quantity, p.stock, p.name
       FROM cart_items ci
       LEFT JOIN products p ON ci.productId = p.id
       WHERE ci.userId = ? AND (ci.quantity > p.stock OR p.status != 'active')`,
      [userId]
    );
    return rows;
  }
}

module.exports = Cart; 