const { pool } = require('../config/database');

class Music {
  static async create(musicData) {
    console.log(`🗃️ Database: INSERT music -`, {
      name: musicData.name,
      artist: musicData.artist,
      album: musicData.album,
      youtube_video_id: musicData.youtube_video_id
    });
    
    const [result] = await pool.execute(
      'INSERT INTO music (name, artist, album, youtube_url, youtube_video_id) VALUES (?, ?, ?, ?, ?)',
      [musicData.name, musicData.artist, musicData.album, musicData.youtube_url, musicData.youtube_video_id]
    );
    
    console.log(`🗃️ Database: INSERT successful - ID: ${result.insertId}`);
    return result.insertId;
  }

  static async findAll() {
    console.log(`🗃️ Database: SELECT * FROM music`);
    const [rows] = await pool.execute('SELECT * FROM music ORDER BY created_at DESC');
    
    console.log(`🗃️ Database: SELECT returned ${rows.length} rows`);
    return rows;
  }

  static async findById(id) {
    console.log(`🗃️ Database: SELECT music by ID: ${id}`);
    const [rows] = await pool.execute('SELECT * FROM music WHERE id = ?', [id]);
    
    console.log(`🗃️ Database: SELECT by ID found ${rows.length} results`);
    return rows[0];
  }

  static async delete(id) {
    console.log(`🗃️ Database: DELETE music with ID: ${id}`);
    const [result] = await pool.execute('DELETE FROM music WHERE id = ?', [id]);
    
    console.log(`🗃️ Database: DELETE affected ${result.affectedRows} rows`);
    return result.affectedRows > 0;
  }

  static async searchByName(name) {
    console.log(`🗃️ Database: SEARCH music by name/artist: "${name}"`);
    const [rows] = await pool.execute(
      'SELECT * FROM music WHERE name LIKE ? OR artist LIKE ? ORDER BY created_at DESC',
      [`%${name}%`, `%${name}%`]
    );
    
    console.log(`🗃️ Database: SEARCH found ${rows.length} matches for "${name}"`);
    return rows;
  }
}

module.exports = Music;