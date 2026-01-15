/**
 * DebugPanel Component
 * Debug controls for testing daily puzzle system
 * Only visible when ?debug=true is in URL
 */

import React from 'react';

export function DebugPanel({
  effectiveDate,
  puzzleNumber,
  debugOffset,
  gameStatus,
  guesses,
  onPrevDay,
  onNextDay,
  onResetDate,
  onClearData
}) {
  return (
    <div className="debug-panel">
      <div className="debug-header">
        <span className="debug-badge">DEBUG MODE</span>
      </div>

      <div className="debug-info-row">
        <span>Date: <strong>{effectiveDate}</strong></span>
        <span>Puzzle: <strong>#{puzzleNumber}</strong></span>
        <span>Offset: <strong>{debugOffset} days</strong></span>
      </div>

      <div className="debug-info-row">
        <span>Status: <strong>{gameStatus}</strong></span>
        <span>Guesses: <strong>{guesses.length}</strong></span>
      </div>

      <div className="debug-buttons">
        <button className="debug-btn" onClick={onPrevDay} title="Go back one day">
          -1 Day
        </button>
        <button className="debug-btn" onClick={onNextDay} title="Go forward one day">
          +1 Day
        </button>
        <button className="debug-btn" onClick={onResetDate} title="Reset to today">
          Reset Date
        </button>
        <button className="debug-btn debug-btn-danger" onClick={onClearData} title="Clear all localStorage data">
          Clear Data
        </button>
      </div>
    </div>
  );
}

export default DebugPanel;
