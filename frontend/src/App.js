import React, { useState } from 'react';
import axios from 'axios';
import QuickActions from './QuickActions';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
     const { data } = await axios.post(`https://abbey-bank-dashboard.onrender.com${url}`, formData);
      if (isLogin) setUser(data.user);
      else { alert("Registration successful! Please login."); setIsLogin(true); }
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Connection failed"));
    }
  };

  const handleTransfer = () => {
    if (!transferAmount || Number(transferAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (Number(transferAmount) > user.balance) {
      alert("Insufficient funds!");
      return;
    }
    // Simulate a transfer
    alert(`Transfer of ₦${Number(transferAmount).toLocaleString()} successful!`);
    setUser({ ...user, balance: user.balance - Number(transferAmount) });
    setShowTransfer(false);
    setTransferAmount('');
  };

  // --- DASHBOARD VIEW ---
  if (user) {
    return (
      <div style={{ background: '#020617', color: 'white', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: '450px', margin: 'auto', background: '#0f172a', padding: '30px', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', position: 'relative' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontStyle: 'italic', fontWeight: '900', color: '#f97316', margin: 0 }}>ABBEY</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Active Session</span>
          </div>
          
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 5px 0' }}>TOTAL BALANCE</p>
          <h1 style={{ fontSize: '42px', margin: '0 0 20px 0', fontWeight: '700' }}>₦{Number(user.balance || 0).toLocaleString()}.00</h1>
          
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#94a3b8' }}>Account Name</span>
              <span>{user.username}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Account Number</span>
              <span style={{ letterSpacing: '1px' }}>{user.accountNo || '3094857261'}</span>
            </div>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>QUICK SERVICES</p>
          <QuickActions onAction={(name) => name === 'Transfer' && setShowTransfer(true)} />

          <button onClick={() => setUser(null)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: '600', marginTop: '20px' }}>
            SECURE LOGOUT
          </button>
        </div>

        {/* TRANSFER MODAL */}
        {showTransfer && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
            <div style={{ background: '#0f172a', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '350px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#f97316' }}>Send Money</h3>
              <input 
                type="number" placeholder="Enter Amount" 
                style={{ width: '100%', padding: '15px', marginBottom: '15px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none' }}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <input 
                type="text" placeholder="Account Number" 
                style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '12px', border: '1px solid #1e293b', background: '#1e293b', color: 'white', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowTransfer(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleTransfer} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#f97316', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- LOGIN/REGISTER VIEW ---
  return (
    <div style={{ background: '#020617', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ width: '100%', maxWidth: '350px', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', fontStyle: 'italic', marginBottom: '8px' }}>
          ABBEY <span style={{ color: '#f97316' }}>×</span> ABBEY
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