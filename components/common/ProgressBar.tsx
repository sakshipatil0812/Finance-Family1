import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: 'indigo' | 'green' | 'yellow' | 'red';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, color = 'indigo' }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  const colorClasses = {
    indigo: 'bg-gradient-to-r from-purple-500 to-pink-500',
    green: 'bg-teal-500',
    yellow: 'bg-orange-500',
    red: 'bg-pink-500',
  };

  return (
    <div className="w-full bg-slate-700/50 rounded-full h-3">
      <div
        className={`h-3 rounded-full transition-[width] ease-out duration-500 ${colorClasses[color]}`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;