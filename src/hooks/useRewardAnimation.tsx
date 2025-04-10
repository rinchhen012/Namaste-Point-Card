import { useState, useRef } from 'react';
import RewardAnimation from '../components/RewardAnimation';

interface UseRewardAnimationReturn {
  showRewardAnimation: (message?: string) => void;
  RewardAnimationComponent: JSX.Element | null;
}

const useRewardAnimation = (): UseRewardAnimationReturn => {
  const [animation, setAnimation] = useState<{message: string, key: string} | null>(null);
  const counterRef = useRef(0);

  const showRewardAnimation = (message = 'Reward Redeemed!') => {
    // Increment counter to ensure uniqueness even if called in same millisecond
    counterRef.current += 1;
    const uniqueKey = `${Date.now()}-${counterRef.current}`;
    
    setAnimation({
      message,
      key: uniqueKey
    });
    
    // Automatically clear animation after it completes
    setTimeout(() => {
      setAnimation(null);
    }, 2000);
  };

  return {
    showRewardAnimation,
    RewardAnimationComponent: animation ? (
      <RewardAnimation 
        key={animation.key}
        message={animation.message}
      />
    ) : null
  };
};

export default useRewardAnimation; 