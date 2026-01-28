/**
 * TutorialOverlay Component
 *
 * Shows a video tutorial overlay for first-time visitors.
 * - Auto-plays on first visit (checks localStorage)
 * - Skip button available
 * - Auto-dismisses on video end
 * - Marks tutorial as seen to prevent replay
 */

import React, { useEffect, useRef, useState } from 'react';
import { trackFeature, trackFunnel } from '../../lib/analytics.js';
import './TutorialOverlay.css';

const TUTORIAL_SEEN_KEY = 'bowldem_tutorial_seen';

/**
 * Check if user has seen the tutorial
 */
export function hasTutorialBeenSeen() {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark tutorial as seen
 */
export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch (e) {
    console.warn('Failed to save tutorial state:', e);
  }
}

/**
 * Reset tutorial seen state (for testing)
 */
export function resetTutorialSeen() {
  try {
    localStorage.removeItem(TUTORIAL_SEEN_KEY);
  } catch (e) {
    console.warn('Failed to reset tutorial state:', e);
  }
}

// Check URL for reset parameter (for testing)
if (typeof window !== 'undefined' && window.location.search.includes('reset_tutorial')) {
  resetTutorialSeen();
  // Remove the parameter from URL
  window.history.replaceState({}, '', window.location.pathname);
}

export function TutorialOverlay({ onComplete, useVideoIfAvailable = false }) {
  const videoRef = useRef(null);
  // Default to static tutorial (videoError = true) unless video mode is explicitly requested
  const [videoError, setVideoError] = useState(!useVideoIfAvailable);
  const [isLoading, setIsLoading] = useState(useVideoIfAvailable);

  // Track tutorial view on mount
  useEffect(() => {
    trackFeature.tutorialViewed();
    trackFunnel.tutorialSeen();
  }, []);

  // Handle video end
  const handleVideoEnd = () => {
    trackFeature.tutorialCompleted();
    markTutorialSeen();
    onComplete?.();
  };

  // Handle skip button
  const handleSkip = () => {
    trackFeature.tutorialSkipped();
    markTutorialSeen();
    onComplete?.();
  };

  // Handle video error (fallback to static tutorial)
  const handleVideoError = () => {
    setVideoError(true);
    setIsLoading(false);
  };

  // Handle video loaded
  const handleVideoLoaded = () => {
    setIsLoading(false);
  };

  // Auto-play video on mount
  useEffect(() => {
    if (videoRef.current && !videoError) {
      videoRef.current.play().catch(() => {
        // Autoplay was prevented, show play button or continue
        setIsLoading(false);
      });
    }
  }, [videoError]);

  // Render fallback static tutorial if video fails
  if (videoError) {
    return (
      <div className="tutorial-overlay">
        <div className="tutorial-content tutorial-content-fallback">
          <h2 className="tutorial-title">How to Play Bowldem</h2>
          <p className="tutorial-subtitle">Wordle, but for cricket</p>

          <div className="tutorial-steps">
            <div className="tutorial-step">
              <span className="step-number">1</span>
              <span className="step-text">See the venue hint and match scores</span>
            </div>
            <div className="tutorial-step">
              <span className="step-number">2</span>
              <span className="step-text">Type a cricketer's name to guess the MOTM</span>
            </div>
            <div className="tutorial-step">
              <span className="step-number">3</span>
              <span className="step-text">Get feedback on your guess:</span>
            </div>
          </div>

          <div className="ptrm-legend">
            <div className="legend-item">
              <span className="legend-circle legend-p">P</span>
              <span className="legend-label">PLAYED IN MATCH?</span>
            </div>
            <div className="legend-item">
              <span className="legend-circle legend-t">T</span>
              <span className="legend-label">SAME TEAM AS MOTM?</span>
            </div>
            <div className="legend-item">
              <span className="legend-circle legend-r">R</span>
              <span className="legend-label">SAME ROLE AS MOTM?</span>
            </div>
            <div className="legend-item">
              <span className="legend-circle legend-m">M</span>
              <span className="legend-label">IS THIS THE MOTM?</span>
            </div>
          </div>

          <p className="tutorial-footer">5 guesses to find the Man of the Match!</p>

          <button className="tutorial-start-btn" onClick={handleSkip}>
            Start Playing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-content">
        {isLoading && (
          <div className="tutorial-loading">
            <div className="loading-spinner"></div>
            <p>Loading tutorial...</p>
          </div>
        )}

        <video
          ref={videoRef}
          className="tutorial-video"
          src="/videos/tutorial.mp4"
          autoPlay
          playsInline
          muted={false}
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          onLoadedData={handleVideoLoaded}
          style={{ display: isLoading ? 'none' : 'block' }}
        />

        <button className="tutorial-skip" onClick={handleSkip}>
          Skip
        </button>
      </div>
    </div>
  );
}

export default TutorialOverlay;
