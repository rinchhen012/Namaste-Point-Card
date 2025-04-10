import React, { useState, useEffect } from 'react';

interface RewardAnimationProps {
  message?: string;
}

const RewardAnimation: React.FC<RewardAnimationProps> = ({ message = 'Reward Redeemed!' }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Hide after animation completes
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white px-6 py-4 rounded-lg shadow-lg animate-slide-up-fade">
        <div className="flex items-center">
          <svg className="w-10 h-10 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-xl font-bold text-gray-800">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default RewardAnimation; 