const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Cleaned to use your standard centralized native db structure
const { transferFunds } = require('./transactionController');

const app = express();
const PORT = process.env.PORT || 10000;

// --- GLOBAL MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- BASE CHECK LINK ---
app.get('/', (req, res) => {
  res.send('Akoka Bank Backend Core Online.');
});

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  try {
    const generatedAccountNo = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const defaultPin = "1234"; 

    const result = await pool.query(
      'INSERT INTO users (username, email, password, account_number, transaction_pin) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, balance, account_number',
      [username, email.trim().toLowerCase(), password, generatedAccountNo, defaultPin]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      if (user.password === password) {
        delete user.password; // Strip credential out before shipping payload
        return res.json({ user });
      } else {
        return res.status(401).json({ error: "Invalid login credentials provided" });
      }
    } else {
      return res.status(401).json({ error: "Invalid login credentials provided" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRANSACTIONS BOUNDARY ROUTE LINK ---
// Automatically calls our secure isolated client pipeline logic from transactionController
app.post('/api/transfer', transferFunds);


// --- 🔥 ADDED: RETRIEVE USER HISTORICAL TRANSACTIONS ---
// Handles both integer IDs and fallback string emails dynamically
app.get('/api/transactions/:userId', async (req, res) => {
  const { userId } = req.params;
  const isEmail = typeof userId === 'string' && userId.includes('@');
  
  try {
    // 1. Resolve the user's absolute database ID if an email was passed from the client session
    let targetId = userId;
    if (isEmail) {
      const userLookup = await pool.query('SELECT id FROM users WHERE email = $1', [userId.trim().toLowerCase()]);
      if (userLookup.rowCount === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
      targetId = userLookup.rows[0].id;
    }

    // 2. Query the ledger tracking records matching sender OR receiver parameters
    const historyRes = await pool.query(`
      SELECT 
        t.id, t.sender_id, t.receiver_id, t.amount, t.reference_id, t.created_at, t.status,
        u1.account_number as sender_account,
        u2.account_number as receiver_account
      FROM transactions t
      JOIN users u1 ON t.sender_id = u1.id
      JOIN users u2 ON t.receiver_id = u2.id
      WHERE t.sender_id = $1 OR t.receiver_id = $1
      ORDER BY t.created_at DESC
    `, [targetId]);

    res.status(200).json({ success: true, data: historyRes.rows });
  } catch (err) {
    console.error("Ledger history data payload fetch exception:", err);
    res.status(500).json({ success: false, message: "Could not retrieve structural transaction list matrix." });
  }
});


// --- FIRE ALL CYLINDERS ---
app.listen(PORT, () => {
  console.log(`\n====> CORE ENGINE ENGAGED: LISTENING ON PORT ${PORT} <====\n`);
});