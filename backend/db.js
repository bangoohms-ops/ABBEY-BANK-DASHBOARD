const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "mac",
  password: process.env.DB_PASSWORD || "1985",
  port: parseInt(process.env.DB_PORT || "5432"),
  // ADD THESE CLOUD PARAMETERS:
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds to force fresh clones
  connectionTimeoutMillis: 2000, // Return an error quickly if the database hangs
});

// Setup an error listener on the pool to catch silent connection drops
pool.on('error', (err, client) => {
  console.error('💥 Unexpected idle PostgreSQL client error:', err.message);
});

module.exports = pool;