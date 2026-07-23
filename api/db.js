const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.PASBAN_DB_HOST || '127.0.0.1',
  port: Number(process.env.PASBAN_DB_PORT || 3306),
  user: process.env.PASBAN_DB_USER || 'root',
  password: process.env.PASBAN_DB_PASSWORD || '',
  database: process.env.PASBAN_DB_NAME || 'pasbaaza_pasbaneaza_org_db',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  namedPlaceholders: true,
});

module.exports = { pool };
