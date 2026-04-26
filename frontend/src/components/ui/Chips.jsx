import React from 'react';

export const SelectionChip = ({ label, ...props }) => {
  const style = {
    fontFamily: 'var(--font-functional)',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.25rem 0.75rem',
    backgroundColor: 'var(--secondary-container)',
    color: 'var(--on-secondary-container)',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-block'
  };

  return (
    <div style={style} {...props}>
      {label}
    </div>
  );
};
