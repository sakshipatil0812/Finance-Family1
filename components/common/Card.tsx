import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, className = '', style }) => {
  return (
    <div 
      className={`bg-slate-900/30 backdrop-blur-lg border border-slate-700/50 shadow-2xl shadow-black/20 rounded-xl p-6 ${className}`} 
      style={style}
    >
      {children}
    </div>
  );
};

export default Card;