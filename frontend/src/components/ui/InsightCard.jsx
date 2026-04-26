import React from 'react';
import { Sparkles } from 'lucide-react';

export const InsightCard = ({ title, children, showIcon = true }) => {
  return (
    <div style={{ 
      background: 'var(--tertiary-fixed)', 
      padding: '1.5rem', 
      borderRadius: 'var(--radius-default)', 
      borderLeft: '4px solid var(--tertiary)', 
      boxShadow: 'var(--shadow-ambient)' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        {showIcon && <Sparkles size={16} color="var(--tertiary)" />}
        <span className="title-sm" style={{ color: 'var(--tertiary)' }}>{title || "AI Insight"}</span>
      </div>
      <div className="body-sm" style={{ color: 'var(--on-surface)', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
};
