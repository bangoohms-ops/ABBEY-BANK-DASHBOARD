const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- FIX STARTS HERE ---
// This uses the Render Environment Variable if it exists, otherwise defaults to your local setup
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render provides this
  ssl: isProduction ? { rejectUnauthorized: false } : false, // Required for Render
  // Fallback for local testing if DATABASE_URL isn't set
  ...( !process.env.DATABASE_URL && {
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'your_password', 
    port: 5432,
  })
});
// --- FIX ENDS HERE ---

pool.connect((err) => {
  if (err) console.log("❌ CONNECTION ERROR:", err.message);
  else console.log("✅ DATABASE ONLINE");
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.log("REG ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length > 0) res.json({ user: result.rows[0] });
    else res.status(401).json({ error: "Invalid login" });
  } catch (err) {
    console.log("LOGIN ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(createTableQuery)
  .then(() => console.log("✅ Users table is ready"))
  .catch((err) => console.error("❌ Error creating table:", err));

// Use Render's dynamic port or default to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 SERVER ON PORT ${PORT}`));