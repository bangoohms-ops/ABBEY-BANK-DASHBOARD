const pool = require("./db");
const bcrypt = require("bcryptjs"); // Ensure you use bcryptjs for consistency
const nodemailer = require("nodemailer");
const axios = require("axios");

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "bangoohms@gmail.com",
    pass: "owuofapwkfkcvsvs",
  },
});

const sendTransactionAlerts = async (sender, receiver, amount, reference, metadata = {}) => {
  try {
    const localCurrencyAmount = `₦${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    
    if (receiver.email) {
      await emailTransporter.sendMail({
        from: '"Akoka Bank" <no-reply@akokabank.com>',
        to: receiver.email,
        subject: `Credit Alert: ${localCurrencyAmount}`,
        html: `<p>You received ${localCurrencyAmount} from ${sender.username}.</p>`
      });
    }
  } catch (err) {
    console.error("Notification Error:", err.message);
  }
};

const transferFunds = async (req, res) => {
  const { senderId, receiverAccount, amount, pin, utilityType } = req.body;

  if (!senderId || !receiverAccount || !amount || !pin) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get Sender - Added check for null
    const senderRes = await client.query("SELECT * FROM users WHERE id = $1", [senderId]);
    const sender = senderRes.rows[0];

    if (!sender) {
        throw new Error("Sender account not found in database.");
    }

    // 2. Validate PIN
    const isPinValid = await bcrypt.compare(String(pin), sender.transaction_pin);
    if (!isPinValid) {
        throw new Error("Invalid Transaction Authorization PIN");
    }

    // 3. Check Funds
    if (parseFloat(sender.balance) < parseFloat(amount)) {
        throw new Error("Insufficient funds");
    }

    // 4. Get Receiver
    const receiverRes = await client.query("SELECT * FROM users WHERE account_number = $1", [receiverAccount]);
    if (receiverRes.rowCount === 0) {
        throw new Error("Receiver account not found");
    }
    const receiver = receiverRes.rows[0];

    // Check for self-transfer
    if (sender.id === receiver.id) {
        throw new Error("Cannot transfer to yourself");
    }

    // 5. Atomic Update
    await client.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [amount, senderId]);
    await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [amount, receiver.id]);
    
    const ref = `TXN-${Date.now()}`;
    await client.query("INSERT INTO transactions (sender_id, receiver_id, amount, reference_id) VALUES ($1, $2, $3, $4)", 
      [sender.id, receiver.id, amount, ref]);

    await client.query("COMMIT");
    
    // Trigger notifications
    sendTransactionAlerts(sender, receiver, amount, ref, { utilityType });

    res.status(200).json({ success: true, message: "Transfer successful", reference: ref });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transfer Error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

module.exports = { transferFunds };