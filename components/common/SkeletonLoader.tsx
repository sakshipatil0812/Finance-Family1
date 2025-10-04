import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className = '' }) => {
  return (
    <div className={`animate-shimmer rounded-md ${className}`} />
  );
};

export default SkeletonLoader;