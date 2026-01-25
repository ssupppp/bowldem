/**
 * Toast Component
 *
 * Simple toast notification for displaying temporary messages
 * Auto-dismisses after a timeout
 *
 * Usage:
 *   <Toast message="Copied to clipboard!" type="success" />
 *   <Toast message="Network error" type="error" />
 */

import React, { useEffect, useState } from 'react';
import './Toast.css';

export function Toast({
  message,
  type = 'info', // 'info' | 'success' | 'error' | 'warning'
  duration = 3000,
  onClose
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 300); // Match exit animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`toast toast-${type} ${isExiting ? 'toast-exit' : ''}`}>
      <span className="toast-message">{message}</span>
    </div>
  );
}

/**
 * ToastContainer - Manages multiple toasts
 */
export function ToastContainer({ toasts = [], onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onDismiss?.(toast.id || index)}
        />
      ))}
    </div>
  );
}

/**
 * useToast hook - Simple toast state management
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showSuccess = (message) => addToast(message, 'success');
  const showError = (message) => addToast(message, 'error');
  const showWarning = (message) => addToast(message, 'warning');
  const showInfo = (message) => addToast(message, 'info');

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}

export default Toast;
