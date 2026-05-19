const pool = require('./db'); 
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const axios = require('axios');

// --- 📧 1. REAL EMAIL GATEWAY ENGINE ---
// Configured for Mailtrap Sandbox testing. Swap parameters if utilizing live SMTP (e.g. Gmail).
const emailTransporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "d58294be8bf770", // <-- Replace with your real Mailtrap Stream User
    pass: "cf17a199c517c9"  // <-- Replace with your real Mailtrap Stream Pass
  }
});

const sendTransactionAlerts = async (sender, receiver, amount, reference) => {
    try {
        const localCurrencyAmount = `₦${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        console.log(`\n=== 📲 TRANSMISSION UTILITY LIGHTS ===`);

        // --- EXECUTE REAL EMAIL DISPATCH ---
        if (receiver.email) {
            try {
                await emailTransporter.sendMail({
                    from: '"Akoka Bank" <no-reply@akokabank.com>',
                    to: receiver.email,
                    subject: `Transaction Alert [CREDIT: ${localCurrencyAmount}]`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 24px; background-color: #0f172a; color: white; border-radius: 16px; max-width: 450px; border: 1px solid #1e293b;">
                            <h2 style="color: #4ade80; margin: 0 0 4px 0; font-size: 20px;">Credit Alert Notification</h2>
                            <p style="color: #64748b; font-size: 12px; margin: 0 0 20px 0;">Akoka Ledger Tracking Network</p>
                            
                            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 4px 0;">AMOUNT RECEIVED</p>
                            <h1 style="color: #4ade80; font-size: 32px; margin: 0 0 20px 0; font-weight: 700;">${localCurrencyAmount}</h1>
                            
                            <div style="background-color: #1e293b; padding: 16px; border-radius: 12px; font-size: 14px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: #94a3b8;">Sender:</span>
                                    <span style="font-weight: 600; color: white;">${sender.username}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #94a3b8;">Reference:</span>
                                    <span style="font-family: monospace; color: #f97316;">${reference.substring(0, 18)}...</span>
                                </div>
                            </div>
                            <p style="font-size: 11px; color: #64748b; margin: 20px 0 0 0; text-align: center;">Secure Automated Transaction Ledger Confirmation Engine.</p>
                        </div>
                    `
                });
                console.log(`[EMAIL DISPATCH SUCCESS] -> Drop pushed cleanly to: ${receiver.email}`);
            } catch (emailErr) {
                console.error("❌ Outbound Email Network Pipeline Exception:", emailErr.message);
            }
        }

        // --- EXECUTE REAL SMS DISPATCH (Termii API Architecture) ---
        // Cleans and reformats phone targets dynamically to support international standard routing
        const rawPhone = receiver.phone_number || receiver.phone;
        if (rawPhone) {
            try {
                let formattedPhone = rawPhone.trim();
                if (formattedPhone.startsWith('0')) {
                    formattedPhone = '234' + formattedPhone.substring(1);
                }

                await axios.post('https://api.ng.termii.com/api/sms/send', {
                    to: formattedPhone,
                    from: "AkokaBank", 
                    sms: `Akoka Bank Credit Alert!\nAmt: ${localCurrencyAmount} CR\nFrom: ${sender.username}\nRef: ${reference.substring(0,16)}`,
                    type: "plain",
                    channel: "generic",
                    api_key: "TLrjyuXaYPmhPbHRUCwucCKjcwWXptyQylhnexNNGuPCgpqYEWGMenwTDlvGOA" // <-- Replace with your active Termii credentials API Key
                });
                console.log(`[SMS SEND SUCCESS] -> Outbound payload delivered to cellular link: ${formattedPhone}`);
            } catch (smsErr) {
                console.error("❌ SMS Outbound Service Pipeline Exception:", smsErr.response?.data || smsErr.message);
            }
        }

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
        // 1. AUTHENTICATE SENDER ACCOUNT INSTANCE
        const queryField = typeof senderId === 'string' && senderId.includes('@') ? 'email' : 'id';
        const userRes = await client.query(`SELECT id, username, transaction_pin, balance, email, phone_number FROM users WHERE ${queryField} = $1`, [senderId]);
        const sender = userRes.rows[0];

        if (!sender) {
            client.release();
            return res.status(444).json({ success: false, message: "Sender record missing." });
        }

        // 2. VALIDATE TRANSACTION PIN SECURITY PARAMETERS
        let isPinValid = false;
        try {
            isPinValid = await bcrypt.compare(String(pin), sender.transaction_pin);
        } catch (e) {
            isPinValid = String(sender.transaction_pin) === String(pin);
        }

        if (!isPinValid && String(sender.transaction_pin) !== String(pin)) {
            client.release();
            return res.status(403).json({ success: false, message: "Invalid Transaction Authorization PIN" });
        }

        // Parse explicit floats to prevent PostgreSQL numeric column scale mismatch crashes
        const transferAmountNum = parseFloat(amount);
        const senderBalanceNum = parseFloat(sender.balance);

        // 3. AUDIT BALANCE RESERVE LIMITS
        if (senderBalanceNum < transferAmountNum) {
            client.release();
            return res.status(400).json({ success: false, message: "Insufficient funds inside the ledger cache registry" });
        }

        // 4. LOCATE VALID DESTINATION RECEIVER REGISTER
        const receiverRes = await client.query('SELECT id, username, balance, email, phone_number FROM users WHERE account_number = $1', [receiverAccount]);
        if (receiverRes.rowCount === 0) {
            client.release();
            return res.status(404).json({ success: false, message: "Targeted recipient account registry index missing" });
        }
        const receiver = receiverRes.rows[0];
        const receiverBalanceNum = parseFloat(receiver.balance);

        if (sender.id === receiver.id) {
            client.release();
            return res.status(400).json({ success: false, message: "Self-transfers to your own destination profile are restricted" });
        }

        // Calculate explicit balance steps before the query runs
        const newSenderBalance = senderBalanceNum - transferAmountNum;
        const newReceiverBalance = receiverBalanceNum + transferAmountNum;

        // --- ATOMIC RUN ENGINE ---
        await client.query('BEGIN');

        // 5. EXECUTE BALANCE VALUE EXCHANGE WITH SAFE STRING STRATIFICATION
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newSenderBalance.toFixed(2), sender.id]);
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newReceiverBalance.toFixed(2), receiver.id]);

        // 6. COMPILE ATOMIC REFERENCE KEY ENTRIES
        const ref = `TXN-${Date.now()}-${sender.id}`;
        await client.query(
            'INSERT INTO transactions (sender_id, receiver_id, amount, status, reference_id) VALUES ($1, $2, $3, $4, $5)',
            [sender.id, receiver.id, transferAmountNum.toFixed(2), 'success', ref]
        );

        await client.query('COMMIT');
        client.release(); // Connection released immediately back to pool safely!

        // Fire notifications safely out-of-band. DO NOT "await" this!
        sendTransactionAlerts(sender, receiver, transferAmountNum.toFixed(2), ref);

        // Return instant success to the React frontend dashboard
        return res.status(200).json({ 
            success: true, 
            message: "Transfer Processed Successfully", 
            reference: ref,
            newBalance: newSenderBalance
        });

    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error("Rollback fail error:", rollbackErr.message);
        }
        client.release();
        console.error("❌ Exception Intercepted inside Ledger Stream:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { transferFunds };