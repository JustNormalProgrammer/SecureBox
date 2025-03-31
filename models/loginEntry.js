const db = require('../config/db/drizzleDB'); 

class LoginEntry {
  static findByUserId(userId, callback) {
    db.all(
      'SELECT timestamp, user_id, login, page FROM login_entries WHERE user_id = ?',
      [userId],
      callback
    );
  }

  static create({ user_id, login, page }, callback) {
    const timestamp = new Date().toISOString();
    db.run(
      'INSERT INTO login_entries (timestamp, user_id, login, page) VALUES (?, ?, ?, ?)',
      [timestamp, user_id, login, page],
      function (err) {
        callback(err, { timestamp, user_id, login, page });
      }
    );
  }
}

module.exports = LoginEntry;