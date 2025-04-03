const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(user) {
    this.email = user.email;
    this.password = user.password;
    this.fullName = user.fullName;
    this.phone = user.phone;
    this.address = user.address;
    this.role = user.role || 'user';
    this.provider = user.provider || 'local';
    this.providerId = user.providerId;
    this.status = user.status || 'active';
  }

  static async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  async save() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }

    const sql = `INSERT INTO users (email, password, fullName, phone, address, role, provider, providerId, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const [result] = await db.execute(sql, [
      this.email,
      this.password,
      this.fullName,
      this.phone,
      this.address,
      this.role,
      this.provider,
      this.providerId,
      this.status
    ]);

    return result.insertId;
  }

  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = User; 