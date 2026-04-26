import React from 'react';
import { motion } from 'framer-motion';

export const Button = ({ variant = 'primary', style = {}, children, ...props }) => {
  const baseStyle = {
    fontFamily: 'var(--font-functional)',
    fontWeight: 500,
    padding: '0.5rem 1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  };

  let specificStyle = {};

  if (variant === 'primary') {
    specificStyle = {
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
      color: 'var(--on-primary)',
      borderRadius: 'var(--radius-default)',
      boxShadow: 'var(--shadow-ambient)'
    };
  } else if (variant === 'secondary') {
    specificStyle = {
      backgroundColor: 'var(--surface-container-highest)',
      color: 'var(--on-surface)',
      borderRadius: 'var(--radius-default)',
    };
  } else if (variant === 'tertiary') {
    specificStyle = {
      backgroundColor: 'transparent',
      color: 'var(--on-primary-fixed-variant)',
      borderRadius: 'var(--radius-default)',
    };
  }

  const combinedStyle = { ...baseStyle, ...specificStyle, ...style };

  return (
    <motion.button 
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={combinedStyle} 
      {...props}
    >
      {children}
    </motion.button>
  );
};
