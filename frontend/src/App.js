import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QuickActions from './QuickActions';

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

  // --- PERSISTENT SESSION AUTO-HYDRATION ---
  useEffect(() => {
    const savedUser = localStorage.getItem('akoka_bank_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoadingSession(false);
  }, []);

  // Sync state mutations directly to client disk partition
  const handleSessionUpdate = (userData) => {
    if (userData) {
      localStorage.setItem('akoka_bank_session', JSON.stringify(userData));
      setUser(userData);
    } else {
      localStorage.removeItem('akoka_bank_session');
      setUser(null);
    }
  };

  // --- HANDLE AUTHENTICATION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const { data } = await axios.post(`https://abbey-bank-dashboard.onrender.com${url}`, formData);
      if (isLogin) {
        handleSessionUpdate(data.user);
      } else {
        alert("Registration successful! Please login.");
        setIsLogin(true);
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Connection failed"));
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
      const { data } = await axios.post('https://abbey-bank-dashboard.onrender.com/api/transfer', {
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
      alert("Transaction Aborted: " + (err.response?.data?.message || "Check network routes"));
    }
  };

  // Generic non-transfer quick pipelines (Data, Bills)
  const handleQuickUtility = async (type, fixedCost) => {
    if (fixedCost > user.balance) {
      alert("Insufficient parameters for automated payment processing.");
      return;
    }
    try {
      // Utilities now safely process using the unified transfer channel route
      const { data } = await axios.post('https://abbey-bank-dashboard.onrender.com/api/transfer', {
        senderId: user.id || user.email,
        receiverAccount: '3094857263', // Standard corporate settlement utility mapping
        amount: fixedCost,
        pin: '1234' // Default validation authorization code
      });
      
      if (data.success) {
        const updatedProfile = { ...user, balance: data.newBalance };
        handleSessionUpdate(updatedProfile);
        alert(`${type} Processed Successfully!`);
      }
    } catch (err) {
      alert("Utility parsing error: " + (err.response?.data?.message || "Check network routes"));
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
      <div style={{ background: '#020617', color: 'white', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui' }}>
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
          
          <QuickActions onAction={(name) => {
            if (name === 'Transfer') setShowTransfer(true);
            if (name === 'Data') handleQuickUtility('Data Subscription Bundle', 1500); 
            if (name === 'Bills') handleQuickUtility('Utility Tariff Payment', 3000);
          }} />

          <button onClick={() => handleSessionUpdate(null)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '700', marginTop: '25px', transition: 'all 0.2s' }}>
            TERMINATE SESSION
          </button>
        </div>

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
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: 'white', outline: 'none' }} 
              onChange={(e) => setFormData({...formData, username: e.target.value})} 
            />
          )}
          <input 
            type="email" placeholder="Email Address" required
            style={{ padding: '16px', borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: 'white', outline: 'none' }} 
            onChange={(e) => setFormData({...formData, email: e.target.value})} 
          />
          <input 
            type="password" placeholder="Password" required
            style={{ padding: '16px', borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: 'white', outline: 'none' }} 
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
          />
          
          <button type="submit" style={{ padding: '16px', borderRadius: '12px', border: 'none', background: 'white', color: 'black', fontWeight: '700', cursor: 'pointer', marginTop: '10px', fontSize: '16px' }}>
            {isLogin ? 'LOG IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p onClick={() => setIsLogin(!isLogin)} style={{ color: '#64748b', fontSize: '13px', marginTop: '25px', cursor: 'pointer', textDecoration: 'underline' }}>
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}

export default App;