import { useState, useEffect } from 'react';
import PointAnimation from '../components/PointAnimation';

interface UsePointAnimationReturn {
  animatePoints: (amount: number) => void;
  PointAnimationComponent: JSX.Element | null;
}

const usePointAnimation = (): UsePointAnimationReturn => {
  const [animation, setAnimation] = useState<{value: number, isPositive: boolean, key: number} | null>(null);

  const animatePoints = (amount: number) => {
    // Generate a unique key to force re-render even for the same amount
    setAnimation({
      value: Math.abs(amount),
      isPositive: amount > 0,
      key: Date.now()
    });
  };

  useEffect(() => {
    if (animation) {
      // Clear animation after it completes
      const timer = setTimeout(() => {
        setAnimation(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [animation]);

  return {
    animatePoints,
    PointAnimationComponent: animation ? (
      <PointAnimation
        key={animation.key}
        value={animation.value}
        isPositive={animation.isPositive}
      />
    ) : null
  };
};

export default usePointAnimation;
