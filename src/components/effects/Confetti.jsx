/**
 * Confetti Component
 * Triggers a celebratory confetti burst for win states
 * Uses canvas-confetti library with cricket-themed colors
 */

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * Cricket-themed confetti colors
 * Green (cricket pitch), Gold (trophy), White (cricket ball)
 */
const CRICKET_COLORS = ['#22c55e', '#fbbf24', '#ffffff', '#16a34a', '#f59e0b'];

/**
 * Confetti burst effect component
 * @param {boolean} trigger - When true, fires confetti
 * @param {number} duration - Duration of the confetti burst in ms (default: 3000)
 */
export function Confetti({ trigger, duration = 3000 }) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    // Only fire once per trigger cycle
    if (trigger && !hasFiredRef.current) {
      hasFiredRef.current = true;
      fireConfetti(duration);
    }

    // Reset when trigger becomes false
    if (!trigger) {
      hasFiredRef.current = false;
    }
  }, [trigger, duration]);

  return null; // This component doesn't render anything
}

/**
 * Fire a cricket-themed confetti burst
 * @param {number} duration - Total duration of the confetti animation in ms
 */
function fireConfetti(duration = 3000) {
  const end = Date.now() + duration;

  // Initial big burst from both sides
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.1, y: 0.6 },
    colors: CRICKET_COLORS,
    ticks: 200,
    gravity: 0.8,
    scalar: 1.2,
    shapes: ['circle', 'square'],
  });

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.9, y: 0.6 },
    colors: CRICKET_COLORS,
    ticks: 200,
    gravity: 0.8,
    scalar: 1.2,
    shapes: ['circle', 'square'],
  });

  // Continuous smaller bursts
  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      return;
    }

    // Random side bursts
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { x: Math.random(), y: Math.random() * 0.4 + 0.2 },
      colors: CRICKET_COLORS,
      ticks: 150,
      gravity: 1,
      scalar: 0.9,
    });
  }, 250);
}

/**
 * Trigger confetti programmatically (for use outside React)
 */
export function triggerConfetti(duration = 3000) {
  fireConfetti(duration);
}

export default Confetti;
