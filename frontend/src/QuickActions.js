import React from 'react';

const QuickActions = ({ onAction }) => {
  const actions = [
    { name: 'Transfer', icon: '💸' },
    { name: 'Bills', icon: '🧾' },
    { name: 'Airtime', icon: '📱' },
    { name: 'Data', icon: '📶' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {actions.map((item) => (
        <div 
          key={item.name} 
          onClick={() => onAction(item.name)}
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#f97316'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#334155'}
        >
          <span style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{item.name}</span>
        </div>
      ))}
    </div>
  );
};

export default QuickActions;