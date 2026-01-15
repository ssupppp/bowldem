/**
 * CountdownTimer Component
 * Shows countdown to next puzzle (midnight UTC)
 */

import React, { useState, useEffect } from 'react';
import { getMillisecondsUntilNextPuzzle, formatCountdown } from '../utils/dailyPuzzle.js';

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(getMillisecondsUntilNextPuzzle());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getMillisecondsUntilNextPuzzle());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="countdown-timer">
      <div className="countdown-label">Next puzzle in</div>
      <div className="countdown-time">{formatCountdown(timeLeft)}</div>
    </div>
  );
}

export default CountdownTimer;
