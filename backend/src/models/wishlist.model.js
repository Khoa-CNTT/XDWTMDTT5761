const db = require('../config/database');

class Wishlist {
  constructor(wishlistItem) {
    this.userId = wishlistItem.userId;
    this.productId = wishlistItem.productId;
  }

  static async getWishlistItems(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = `SELECT wi.*, 
                  p.name as productName,
                  p.price,
                  p.comparePrice,
                  p.images,
                  p.stock,
                  p.status
                FROM wishlist_items wi
                LEFT JOIN products p ON wi.productId = p.id
                WHERE wi.userId = ?`;
    
    const params = [userId];

    // Get total count
    const [countResult] = await db.execute(
      query.replace(/SELECT wi\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM'),
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    query += ` ORDER BY wi.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.execute(query, params);

    return {
      items: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async findWishlistItem(userId, productId) {
    const [rows] = await db.execute(
      'SELECT * FROM wishlist_items WHERE userId = ? AND productId = ?',
      [userId, productId]
    );
    return rows[0];
  }

  async save() {
    // Check if item already exists in wishlist
    const existingItem = await Wishlist.findWishlistItem(this.userId, this.productId);
    if (existingItem) {
      return false;
    }

    const [result] = await db.execute(
      'INSERT INTO wishlist_items (userId, productId) VALUES (?, ?)',
      [this.userId, this.productId]
    );
    return result.insertId;
  }

  static async removeItem(userId, productId) {
    const [result] = await db.execute(
      'DELETE FROM wishlist_items WHERE userId = ? AND productId = ?',
      [userId, productId]
    );
    return result.affectedRows > 0;
  }

  static async clearWishlist(userId) {
    const [result] = await db.execute(
      'DELETE FROM wishlist_items WHERE userId = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  static async checkProductInWishlist(userId, productId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM wishlist_items WHERE userId = ? AND productId = ?',
      [userId, productId]
    );
    return rows[0].count > 0;
  }
}

module.exports = Wishlist; 