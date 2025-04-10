import React, { useState, useEffect } from 'react';

interface PointAnimationProps {
  value: number;
  isPositive?: boolean;
}

const PointAnimation: React.FC<PointAnimationProps> = ({ value, isPositive = true }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Hide after animation completes
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!visible) return null;
  
  return (
    <div 
      className={`fixed z-50 text-xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'} animate-slide-up-fade pointer-events-none`}
      style={{ 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)'
      }}
    >
      {isPositive ? '+' : ''}{value} pts
    </div>
  );
};

export default PointAnimation; 