import React, { useState } from 'react';

export const ModernInput = ({ ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  const style = {
    fontFamily: 'var(--font-functional)',
    fontSize: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: isFocused ? 'var(--surface-container-lowest)' : 'var(--surface-container-low)',
    color: 'var(--on-surface)',
    border: 'none',
    borderBottom: `2px solid ${isFocused ? 'var(--primary)' : 'var(--outline-variant)'}`,
    outline: 'none',
    transition: 'all 0.2s ease',
    width: '100%',
    borderTopLeftRadius: 'var(--radius-sm)',
    borderTopRightRadius: 'var(--radius-sm)'
  };

  return (
    <input
      style={style}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...props}
    />
  );
};
