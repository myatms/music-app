const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'music_user',
  password: process.env.DB_PASSWORD || 'music_password',
  database: process.env.DB_NAME || 'music_book',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Improved database initialization with retry logic
const initializeDatabase = async (maxRetries = 5, retryDelay = 5000) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      
      // Create music table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS music (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          artist VARCHAR(255),
          album VARCHAR(255),
          youtube_url VARCHAR(500),
          youtube_video_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Music table created/verified successfully');
      connection.release();
      return;
      
    } catch (error) {
      retries++;
      console.error(`❌ Database initialization attempt ${retries} failed:`, error.message);
      
      if (retries < maxRetries) {
        console.log(`🔄 Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('💥 Max retries reached. Database initialization failed.');
        throw error;
      }
    }
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection test successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

module.exports = { pool, initializeDatabase, testConnection };