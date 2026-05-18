const pool = require('../db'); 
const bcrypt = require('bcrypt');

const sendTransactionAlerts = async (sender, receiver, amount, reference) => {
    try {
        console.log(`\n=== 📲 TRANSMISSION UTILITY LIGHTS ===`);
        console.log(`[EMAIL DISPATCH] To: ${receiver.email} | Credit Alert volume: ₦${amount}. Ref: ${reference}`);
        console.log(`[SMS SEND PIPELINE] To: ${receiver.phone_number} | Payload content: ₦${amount} from ${sender.username}.`);
        console.log(`====================================\n`);
    } catch (msgError) {
        console.error("Notification engine failure exception occurred:", msgError);
    }
};

const transferFunds = async (req, res) => {
    console.log("📥 Incoming Request Processing Engine Activated:", req.body);
    const { senderId, receiverAccount, amount, pin } = req.body;
    
    if (!senderId || !receiverAccount || !amount || !pin) {
        return res.status(400).json({ success: false, message: "Missing required operational transaction fields" });
    }

    const client = await pool.connect(); 

    try {
        await client.query('BEGIN');

        // 1. AUTHENTICATE SENDER ACCOUNT INSTANCE
        const queryField = typeof senderId === 'string' && senderId.includes('@') ? 'email' : 'id';
        const userRes = await client.query(`SELECT id, username, transaction_pin, balance, email, phone_number FROM users WHERE ${queryField} = $1`, [senderId]);
        const sender = userRes.rows[0];

        if (!sender) {
            throw new Error(`Sender verification exception for identification mapping [${queryField}: ${senderId}]`);
        }

        // 2. VALIDATE TRANSACTION PIN SECURITY PARAMETERS
        let isPinValid = false;
        try {
            isPinValid = await bcrypt.compare(String(pin), sender.transaction_pin);
        } catch (e) {
            isPinValid = String(sender.transaction_pin) === String(pin);
        }

        if (!isPinValid && String(sender.transaction_pin) !== String(pin)) {
            throw new Error("Invalid Transaction Authorization PIN");
        }

        // 3. AUDIT BALANCE RESERVE LIMITS
        if (Number(sender.balance) < Number(amount)) {
            throw new Error(`Insufficient volume funds inside the ledger cache registry`);
        }

        // 4. LOCATE VALID DESTINATION RECEIVER REGISTER
        const receiverRes = await client.query('SELECT id, username, email, phone_number FROM users WHERE account_number = $1', [receiverAccount]);
        if (receiverRes.rowCount === 0) {
            throw new Error(`Targeted recipient account identification (${receiverAccount}) registry index missing`);
        }
        const receiver = receiverRes.rows[0];

        if (sender.id === receiver.id) {
            throw new Error("Self-transfers to your own destination profile are restricted");
        }

        // 5. EXECUTE BALANCE VALUE EXCHANGE
        await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, sender.id]);
        await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, receiver.id]);

        // 6. COMPILE ATOMIC REFERENCE KEY ENTRIES
        const ref = `TXN-${Date.now()}-${sender.id}`;
        await client.query(
            'INSERT INTO transactions (sender_id, receiver_id, amount, status, reference_id) VALUES ($1, $2, $3, $4, $5)',
            [sender.id, receiver.id, amount, 'success', ref]
        );

        await client.query('COMMIT');

        // Async alert routing triggers safely out-of-band post commit
        await sendTransactionAlerts(sender, receiver, amount, ref);

        res.status(200).json({ 
            success: true, 
            message: "Transfer Processed Successfully", 
            reference: ref,
            newBalance: Number(sender.balance) - Number(amount)
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Exception Intercepted inside Ledger Stream:", error.message);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

module.exports = { transferFunds };