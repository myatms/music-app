const { pool } = require('../config/database');

class Music {
  static async create(musicData) {
    const [result] = await pool.execute(
      'INSERT INTO music (name, artist, album, youtube_url, youtube_video_id) VALUES (?, ?, ?, ?, ?)',
      [musicData.name, musicData.artist, musicData.album, musicData.youtube_url, musicData.youtube_video_id]
    );
    return result.insertId;
  }

  static async findAll() {
    const [rows] = await pool.execute('SELECT * FROM music ORDER BY created_at DESC');
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM music WHERE id = ?', [id]);
    return rows[0];
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM music WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async searchByName(name) {
    const [rows] = await pool.execute(
      'SELECT * FROM music WHERE name LIKE ? OR artist LIKE ? ORDER BY created_at DESC',
      [`%${name}%`, `%${name}%`]
    );
    return rows;
  }
}

module.exports = Music;