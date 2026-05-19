import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QuickActions from './QuickActions';

// Dynamically set API target base route based on environment
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:10000' 
  : 'https://abbey-bank-dashboard.onrender.com';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  
  // UX Application Component Controllers
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [transactionPin, setTransactionPin] = useState('');

  // --- UTILITY TRANSACTION CONTROL STATES ---
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [utilityType, setUtilityType] = useState(''); // 'Data', 'Bills', or 'Airtime'
  const [utilityCost, setUtilityCost] = useState(0);
  const [utilityPin, setUtilityPin] = useState('');
  
  // --- NEW: AIRTIME INTERFACE DRIVEN STATES ---
  const [airtimeNetwork, setAirtimeNetwork] = useState('MTN');
  const [airtimePhone, setAirtimePhone] = useState('');

  // Live Ledger History State
  const [transactions, setTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- FETCH HISTORICAL TRANSACTIONS ---
  const fetchTransactionHistory = async (userIdOrEmail) => {
    if (!userIdOrEmail) return;
    setLoadingHistory(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/transactions/${userIdOrEmail}`);
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (err) {
      console.error("Historical ledger array retrieval failure:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // --- PERSISTENT SESSION AUTO-HYDRATION ---
  useEffect(() => {
    const savedUser = localStorage.getItem('akoka_bank_session');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        fetchTransactionHistory(parsedUser.id || parsedUser.email);
      } catch (e) {
        localStorage.removeItem('akoka_bank_session');
      }
    }
    setLoadingSession(false);
  }, []);

  const handleSessionUpdate = (userData) => {
    if (userData) {
      localStorage.setItem('akoka_bank_session', JSON.stringify(userData));
      setUser(userData);
      fetchTransactionHistory(userData.id || userData.email);
    } else {
      localStorage.removeItem('akoka_bank_session');
      setUser(null);
      setTransactions([]);
    }
  };

  // --- HANDLE AUTHENTICATION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const { data } = await axios.post(`${API_BASE}${url}`, formData);
      if (isLogin) {
        if (data.user) {
          handleSessionUpdate(data.user);
        } else {
          alert("Login error: Missing user object data payload.");
        }
      } else {
        alert("Registration successful! Please login.");
        setIsLogin(true);
      }
    } catch (err) {
      console.error("Authentication system pipeline failure:", err);
      alert("Error: " + (err.response?.data?.error || err.response?.data?.message || "Connection failed to server core."));
    }
  };

  // --- HANDLE SECURE TRANSFERS ---
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    const cost = Number(transferAmount);
    
    if (!destinationAccount || destinationAccount.length < 5) {
      alert("Please check destination account configuration.");
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      alert("Please declare a precise operational volume.");
      return;
    }
    if (cost > user.balance) {
      alert("Insufficient account balance parameters.");
      return;
    }
    if (!transactionPin) {
      alert("Security authorization PIN required.");
      return;
    }

    try {
      const { data } = await axios.post(`${API_BASE}/api/transfer`, {
        senderId: user.id || user.email, 
        receiverAccount: destinationAccount,
        amount: cost,
        pin: transactionPin
      });

      if (data.success) {
        const updatedProfile = { ...user, balance: data.newBalance };
        handleSessionUpdate(updatedProfile);
        
        alert(`Transfer Completed successfully!\nReference ID: ${data.reference}`);
        
        setShowTransfer(false);
        setTransferAmount('');
        setDestinationAccount('');
        setTransactionPin('');
      }
    } catch (err) {
      console.error("Full transfer Axios error payload:", err);
      alert("Transaction Aborted: " + (err.response?.data?.message || err.response?.data?.error));
    }
  };

  // --- TRIGGER UTILITY VERIFICATION OVERLAY ---
  const handleQuickUtilitySelection = (type) => {
    setUtilityType(type);
    setUtilityPin('');
    setAirtimePhone('');
    
    if (type === 'Data') {
      setUtilityCost(1500);
    } else if (type === 'Bills') {
      setUtilityCost(3000);
    } else if (type === 'Airtime') {
      setUtilityCost(''); // Let them input their custom amount
    }
    
    setShowUtilityModal(true);
  };

  // --- AUTHORIZE UTILITY & AIRTIME PAYMENT PIPELINE ---
  const handleUtilitySubmit = async (e) => {
    e.preventDefault();
    const runtimeCost = Number(utilityCost);

    if (isNaN(runtimeCost) || runtimeCost <= 0) {
      alert("Please input a valid transaction amount.");
      return;
    }
    if (runtimeCost > user.balance) {
      alert("Insufficient parameters for automated payment processing.");
      return;
    }
    if (utilityType === 'Airtime' && (!airtimePhone || airtimePhone.length < 10)) {
      alert("Please enter a valid phone number.");
      return;
    }
    if (!utilityPin) {
      alert("PIN required to authorize payment channel.");
      return;
    }

    try {
      const { data } = await axios.post(`${API_BASE}/api/transfer`, {
        senderId: user.id || user.email,
        receiverAccount: '3094857263', // Central billing processor matrix account
        amount: runtimeCost,
        pin: utilityPin 
      });
      
      if (data.success) {
        const updatedProfile = { ...user, balance: data.newBalance };
        handleSessionUpdate(updatedProfile);
        
        const successMessage = utilityType === 'Airtime' 
          ? `₦${runtimeCost.toLocaleString()} ${airtimeNetwork} Airtime successfully sent to ${airtimePhone}!`
          : `${utilityType} Payment Processed Successfully!`;

        alert(successMessage);
        setShowUtilityModal(false);
        setUtilityPin('');
        setAirtimePhone('');
      }
    } catch (err) {
      console.error(`Utility processing failed for ${utilityType}:`, err);
      alert("Utility authorization denied: " + (err.response?.data?.message || "Check PIN or server connectivity"));
    }
  };

  if (loadingSession) {
    return (
      <div style={{ background: '#020617', color: '#64748b', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <p style={{ letterSpacing: '1px', fontWeight: 'bold' }}>SECURE LOADING FLOW...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ background: '#020617', color: 'white', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: '450px', margin: 'auto', background: '#0f172a', padding: '30px', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontStyle: 'italic', fontWeight: '900', color: '#f97316', margin: 0 }}>Akoka Bank</h2>
            <span style={{ fontSize: '12px', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>Live Session</span>
          </div>
          
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 5px 0' }}>TOTAL AVAILABLE BALANCE</p>
          <h1 style={{ fontSize: '42px', margin: '0 0 20px 0', fontWeight: '700' }}>
            ₦{Number(user.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
          </h1>
          
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#94a3b8' }}>Account Name</span>
              <span style={{ fontWeight: '500' }}>{user.username}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Account Number</span>
              <span style={{ letterSpacing: '1.5px', fontWeight: 'bold', color: '#f97316' }}>
                {user.account_number || user.accountNo || '3094857261'}
              </span>
            </div>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>QUICK TRANSACTIONS</p>
          
          {/* --- CAPTURES ALL ACTIONS DYNAMICALLY --- */}
          <QuickActions onAction={(name) => {
            if (name === 'Transfer') setShowTransfer(true);
            if (name === 'Airtime') handleQuickUtilitySelection('Airtime');
            if (name === 'Data') handleQuickUtilitySelection('Data'); 
            if (name === 'Bills') handleQuickUtilitySelection('Bills');
          }} />

          {/* --- TRANSACTION HISTORY RECONCILIATION BLOCK --- */}
          <div style={{ marginTop: '35px', borderTop: '1px solid #1e293b', paddingTop: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>LEDGER TRANSACTION HISTORY</p>
              {loadingHistory && <span style={{ fontSize: '11px', color: '#64748b' }}>Syncing...</span>}
            </div>

            {transactions.length === 0 ? (
              <div style={{ padding: '20px', border: '1px dashed #1e293b', borderRadius: '14px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No recent transactions identified in this session.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                {transactions.map((txn) => {
                  const isDebit = String(txn.sender_id) === String(user.id);
                  return (
                    <div key={txn.id} style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>
                          {isDebit ? `To: ${txn.receiver_account}` : `From: ${txn.sender_account}`}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          {txn.reference_id.substring(0, 16)}...
                        </p>
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '14px', color: isDebit ? '#f87171' : '#4ade80' }}>
                        {isDebit ? '-' : '+'}&nbsp;₦{Number(txn.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={() => handleSessionUpdate(null)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '700', marginTop: '25px' }}>
            TERMINATE SESSION
          </button>
        </div>

        {/* --- STANDARD INTER-BANK TRANSFER INTERFACE --- */}
        {showTransfer && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2,6,23,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px', backdropFilter: 'blur(8px)' }}>
            <div style={{ background: '#0f172a', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '380px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 5px 0', color: 'white', fontWeight: '700' }}>Inter-Bank Transfer</h3>
              <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '20px' }}>Secure transaction channel via Akoka Ledger</p>
              
              <form onSubmit={handleTransferSubmit}>
                <input 
                  type="text" placeholder="Recipient Account Number" required
                  style={{ width: '100%', padding: '15px', marginBottom: '12px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none' }}
                  value={destinationAccount}
                  onChange={(e) => setDestinationAccount(e.target.value)}
                />
                <input 
                  type="number" placeholder="Amount (₦)" required
                  style={{ width: '100%', padding: '15px', marginBottom: '12px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none' }}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
                <input 
                  type="password" placeholder="4-Digit Secure PIN" maxLength={4} required
                  style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none', letterSpacing: '4px', textAlign: 'center' }}
                  value={transactionPin}
                  onChange={(e) => setTransactionPin(e.target.value)}
                />
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowTransfer(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f97316', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Authorize</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- DYNAMIC UTILITY & AIRTIME MODAL SYSTEM --- */}
        {showUtilityModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2,6,23,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101, padding: '20px', backdropFilter: 'blur(8px)' }}>
            <div style={{ background: '#0f172a', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '380px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 5px 0', color: 'white', fontWeight: '700' }}>Purchase {utilityType}</h3>
              <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '20px' }}>Confirm your transaction payload criteria</p>
              
              <form onSubmit={handleUtilitySubmit}>
                
                {/* Conditionally reveal carrier selections for Airtime inputs */}
                {utilityType === 'Airtime' && (
                  <>
                    <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>SELECT NETWORK OPERATOR</label>
                    <select 
                      style={{ width: '100%', padding: '15px', marginBottom: '12px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none', fontWeight: '600' }}
                      value={airtimeNetwork}
                      onChange={(e) => setAirtimeNetwork(e.target.value)}
                    >
                      <option value="MTN">MTN Nigeria</option>
                      <option value="Airtel">Airtel Mobile</option>
                      <option value="Glo">Glo World</option>
                      <option value="9mobile">9mobile Network</option>
                    </select>

                    <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>RECIPIENT PHONE NUMBER</label>
                    <input 
                      type="tel" placeholder="e.g. 08031234567" required
                      style={{ width: '100%', padding: '15px', marginBottom: '12px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none' }}
                      value={airtimePhone}
                      onChange={(e) => setAirtimePhone(e.target.value)}
                    />
                  </>
                )}

                <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                  {utilityType === 'Airtime' ? 'SPECIFY AMOUNT (₦)' : 'SELECT PACKAGE VOLUME COST'}
                </label>
                
                {utilityType === 'Airtime' ? (
                  <input 
                    type="number" placeholder="Enter Amount (₦)" required
                    style={{ width: '100%', padding: '15px', marginBottom: '16px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none' }}
                    value={utilityCost}
                    onChange={(e) => setUtilityCost(e.target.value)}
                  />
                ) : (
                  <select 
                    style={{ width: '100%', padding: '15px', marginBottom: '16px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none', fontWeight: '600' }}
                    value={utilityCost}
                    onChange={(e) => setUtilityCost(Number(e.target.value))}
                  >
                    {utilityType === 'Data' ? (
                      <>
                        <option value={1500}>1.5GB / ₦1,500 (30 Days)</option>
                        <option value={3500}>10GB / ₦3,500 (30 Days)</option>
                        <option value={5000}>25GB / ₦5,000 (30 Days)</option>
                      </>
                    ) : (
                      <>
                        <option value={3000}>Eko Electricity Prepaid Tier 1 / ₦3,000</option>
                        <option value={10000}>Ikeja Electric Token / ₦10,000</option>
                        <option value={15000}>DSTV Compact Subscription / ₦15,000</option>
                      </>
                    )}
                  </select>
                )}

                <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>SECURE PIN AUTHORIZATION</label>
                <input 
                  type="password" placeholder="4-Digit Secure PIN" maxLength={4} required
                  style={{ width: '100%', padding: '15px', marginBottom: '25px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none', letterSpacing: '4px', textAlign: 'center' }}
                  value={utilityPin}
                  onChange={(e) => setUtilityPin(e.target.value)}
                />
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowUtilityModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f97316', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Confirm Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div style={{ background: '#020617', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ width: '100%', maxWidth: '350px', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', fontStyle: 'italic', marginBottom: '8px' }}>
          Akoka <span style={{ color: '#f97316' }}>×</span> BANK
        </h1>
        <p style={{ color: '#64748b', marginBottom: '40px', fontSize: '14px' }}>Secure Digital Banking Portal</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <input 
              type="text" placeholder="Full Name" required
              value={formData.username}
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: 'white', outline: 'none' }} 
              onChange={(e) => setFormData({...formData, username: e.target.value})} 
            />
          )}
          <input 
            type="email" placeholder="Email Address" required
            value={formData.email}
            style={{ padding: '16px', borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: 'white', outline: 'none' }} 
            onChange={(e) => setFormData({...formData, email: e.target.value})} 
          />
          <input 
            type="password" placeholder="Password" required
            value={formData.password}
            style={{ padding: '16px', borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: 'white', outline: 'none' }} 
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
          />
          
          <button type="submit" style={{ padding: '16px', borderRadius: '12px', border: 'none', background: 'white', color: 'black', fontWeight: '700', cursor: 'pointer', marginTop: '10px', fontSize: '16px' }}>
            {isLogin ? 'LOG IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p onClick={() => {
          setIsLogin(!isLogin);
          setFormData({ username: '', email: '', password: '' });
        }} style={{ color: '#64748b', fontSize: '13px', marginTop: '25px', cursor: 'pointer', textDecoration: 'underline' }}>
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}

export default App;