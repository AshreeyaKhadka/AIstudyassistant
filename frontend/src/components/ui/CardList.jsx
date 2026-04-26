import React from 'react';

export const CardList = ({ items }) => {
  // Rule: Separate list items using 12px of vertical white space 
  // and a subtle surface-container-low hover state spanning the full width.

  const listContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px', /* divider-free rule */
    padding: '1rem',
    backgroundColor: 'var(--surface-container-lowest)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-ambient)' 
  };

  return (
    <div style={listContainerStyle}>
      {items.map((item, index) => (
        <ListItem key={index} title={item.title} subtitle={item.subtitle} />
      ))}
    </div>
  );
};

const ListItem = ({ title, subtitle }) => {
  // In a robust implementation, hover effects are best done in a regular CSS file to use :hover selector.
  // Using inline style here for simplicity, but we acknowledge the hover rule.

  const itemStyle = {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  return (
    <div 
      style={itemStyle} 
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-container-low)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div className="title-sm">{title}</div>
      <div className="body-sm" style={{ color: 'var(--outline-variant)' }}>{subtitle}</div>
    </div>
  );
};
