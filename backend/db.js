const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  // If DATABASE_URL is set, pg will ignore these individual fields
  // If you are relying on these fields, ensure DATABASE_URL is NOT set in your .env
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "mac",
  password: process.env.DB_PASSWORD || "1985",
  port: parseInt(process.env.DB_PORT || "5432"),
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 10000, // INCREASED to 10 seconds
});
// Setup an error listener on the pool to catch silent connection drops
pool.on('error', (err, client) => {
  console.error('💥 Unexpected idle PostgreSQL client error:', err.message);
});

module.exports = pool;