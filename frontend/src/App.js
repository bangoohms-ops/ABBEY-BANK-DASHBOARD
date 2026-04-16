import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const { data } = await axios.post(`http://localhost:5000${url}`, formData);
      if (isLogin) setUser(data.user);
      else { alert("Registration successful! Please login."); setIsLogin(true); }
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Connection failed"));
    }
  };

  // --- DASHBOARD VIEW ---
  if (user) return (
    <div style={{ background: '#020617', color: 'white', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '450px', margin: 'auto', background: '#0f172a', padding: '30px', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontStyle: 'italic', fontWeight: '900', color: '#f97316', margin: 0 }}>ABBEY</h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Active Session</span>
        </div>
        
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 5px 0' }}>TOTAL BALANCE</p>
        <h1 style={{ fontSize: '42px', margin: '0 0 20px 0', fontWeight: '700' }}>₦{Number(user.balance).toLocaleString()}.00</h1>
        
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

        <button onClick={() => setUser(null)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>
          SECURE LOGOUT
        </button>
      </div>
    </div>
  );

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