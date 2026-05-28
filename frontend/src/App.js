import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QuickActions from './QuickActions';

const API_BASE = 'https://abbey-bank-dashboard-2a8h.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [history, setHistory] = useState([]);
  const [formData, setFormData] = useState({ toAccount: '', amount: '', pin: '', email: '', password: '', username: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('akoka_bank_session');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const { data } = await axios.post(`${API_BASE}${endpoint}`, formData);
      if (isLogin) {
        localStorage.setItem('akoka_bank_session', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        alert("Account created! Please login.");
        setIsLogin(true);
      }
    } catch (err) { alert(err.response?.data?.error || "Auth Failed"); }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/history?userId=${user.id}`);
      setHistory(data);
      setActiveView('History');
    } catch (err) { alert("Failed to fetch history"); }
  };

  const handleTransfer = async () => {
    try {
      const payload = {
        senderId: user.id,
        receiverAccount: formData.toAccount,
        amount: formData.amount,
        pin: formData.pin,
        utilityType: activeView
      };
      await axios.post(`${API_BASE}/api/transfer`, payload);
      alert("Transaction Successful!");
      setActiveView('dashboard');
      setFormData({ toAccount: '', amount: '', pin: '' }); // Clear form on success
    } catch (err) { 
      alert("Transfer Failed: " + (err.response?.data?.message || "Check your details")); 
    }
  };

  // --- RENDERING LOGIC ---
  if (!user) return (
    <div style={{ background: '#020617', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <form onSubmit={handleAuth} style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!isLogin && <input placeholder="Full Name" onChange={e => setFormData({...formData, username: e.target.value})} style={inputStyle} />}
        <input placeholder="Email" type="email" onChange={e => setFormData({...formData, email: e.target.value})} style={inputStyle} />
        <input placeholder="Password" type="password" onChange={e => setFormData({...formData, password: e.target.value})} style={inputStyle} />
        <button type="submit" style={buttonStyle}>{isLogin ? 'Login' : 'Register'}</button>
        <p style={{ color: '#64748b', cursor: 'pointer', textAlign: 'center' }} onClick={() => setIsLogin(!isLogin)}>{isLogin ? "No account? Register" : "Have account? Login"}</p>
      </form>
    </div>
  );

  if (activeView !== 'dashboard') return (
    <div style={{ padding: '40px', color: '#fff', maxWidth: '400px', margin: 'auto' }}>
      <h2>{activeView}</h2>
      {activeView === 'History' ? (
        history.map(t => <div key={t.id} style={{ background: '#1e293b', padding: '10px', marginBottom: '5px' }}>₦{t.amount} - {t.reference_id}</div>)
      ) : (
        <>
          <input placeholder="Account / Phone Number" value={formData.toAccount} onChange={e => setFormData({...formData, toAccount: e.target.value})} style={inputStyle} />
          <input placeholder="Amount" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={inputStyle} />
          <input placeholder="Transaction PIN" type="password" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} style={inputStyle} />
          <button onClick={handleTransfer} style={buttonStyle}>Confirm</button>
        </>
      )}
      <button onClick={() => setActiveView('dashboard')} style={{...buttonStyle, background: '#334155', marginTop: '10px'}}>Back</button>
    </div>
  );

  return (
    <div style={{ background: '#020617', minHeight: '100vh', padding: '20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: '#0f172a', padding: '30px', borderRadius: '24px' }}>
        <h2 style={{ color: '#f97316' }}>Akoka Bank</h2>
        <h1 style={{ color: '#fff', fontSize: '32px' }}>₦{Number(user.balance || 0).toLocaleString()}</h1>
        <QuickActions onAction={(name) => {
            setFormData({ toAccount: '', amount: '', pin: '' }); // Reset form on action select
            name === 'History' ? fetchHistory() : setActiveView(name);
        }} />
        <button onClick={() => { localStorage.clear(); setUser(null); }} style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'transparent', color: '#f87171', border: '1px solid #450a0a', borderRadius: '12px' }}>Logout</button>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#1e293b', color: '#fff', boxSizing: 'border-box', marginBottom: '10px' };
const buttonStyle = { padding: '12px', background: '#f97316', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' };

export default App;