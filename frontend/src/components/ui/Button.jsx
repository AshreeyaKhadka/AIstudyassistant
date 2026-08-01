import React from 'react';

export const Button = ({ variant = 'primary', className = '', style = {}, children, ...props }) => {
  let variantClasses = '';

  if (variant === 'primary') {
    variantClasses = 'bg-[#102326] text-white border border-[#102326] hover:bg-[#0b191c]';
  } else if (variant === 'secondary') {
    variantClasses = 'bg-white text-[#111111] border border-[#D7D3CF] hover:bg-[#ECEAE7]';
  } else if (variant === 'outline') {
    variantClasses = 'bg-transparent text-[#111111] border border-[#D7D3CF] hover:bg-[#102326] hover:text-white';
  } else if (variant === 'accent') {
    variantClasses = 'bg-[#C96A32] text-white border border-[#C96A32] hover:bg-[#b05a28]';
  } else {
    variantClasses = 'bg-[#ECEAE7] text-[#111111] border border-[#D7D3CF] hover:bg-[#DCD9D5]';
  }

  return (
    <button
      className={`min-h-9 px-4 py-2 rounded-[4px] font-mono text-xs font-semibold uppercase transition-colors inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
};
