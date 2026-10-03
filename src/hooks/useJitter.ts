import { useRef } from 'react';

const useJitter = (maxMs = 120): (() => { animationDelay: string }) => {
  const slotsRef = useRef<{ animationDelay: string }[]>([]);
  const indexRef = useRef(0);
  indexRef.current = 0;
  return () => {
    const i = indexRef.current++;
    const slots = slotsRef.current;
    if (i >= slots.length) {
      slots.push({ animationDelay: `${Math.random() * maxMs}ms` });
    }
    return slots[i];
  };
};

export { useJitter };
