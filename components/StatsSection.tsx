import React, { useEffect, useState, useRef } from 'react';
import { STATS_DATA } from '../constants';

type CounterOptions = {
  duration?: number;
  postStep?: number;
  postInterval?: number;
};

// Hook for counting up animation
const useCounter = (end: number, options: CounterOptions = {}) => {
  const { duration = 3200, postStep = 0, postInterval = 5000 } = options;
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const nextValue = progress === 1 ? end : Math.floor(easeProgress * end);
      setCount(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setHasCompleted(true);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [end, duration, isVisible]);

  useEffect(() => {
    if (!isVisible || !hasCompleted || !postStep) return;

    const intervalId = window.setInterval(() => {
      setCount((prev) => prev + postStep);
    }, postInterval);

    return () => window.clearInterval(intervalId);
  }, [hasCompleted, isVisible, postInterval, postStep]);

  return { count, ref: countRef };
};

interface StatCardProps {
  icon: React.ElementType;
  target: number;
  label: string;
  postIncrementStep?: number;
  postIncrementInterval?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  target,
  label,
  postIncrementStep,
  postIncrementInterval,
}) => {
  const { count, ref } = useCounter(target, {
    postStep: postIncrementStep,
    postInterval: postIncrementInterval,
  });

  return (
    <div ref={ref} className="bg-brand-cream rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow min-h-[180px] w-full">
      <Icon className="w-12 h-12 text-brand-darkText mb-4" strokeWidth={2.5} />
      <div className="text-3xl font-extrabold text-brand-darkText mb-1">
        {count.toLocaleString()}
      </div>
      <div className="text-sm font-medium text-brand-darkText opacity-80">
        {label}
      </div>
    </div>
  );
};

const StatsSection: React.FC = () => {
  return (
    <section className="py-8 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS_DATA.map((stat) => (
            <StatCard 
              key={stat.id} 
              icon={stat.icon} 
              target={stat.target} 
              label={stat.label}
              postIncrementStep={stat.postIncrementStep}
              postIncrementInterval={stat.postIncrementInterval}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;