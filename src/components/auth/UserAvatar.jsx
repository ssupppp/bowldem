/**
 * UserAvatar Component
 * Small icon in header - profile pic when logged in, generic icon when not
 * Click → AuthModal (logged out) or dropdown with name + sign out (logged in)
 */

import React, { useState, useRef, useEffect } from 'react';

export function UserAvatar({ user, isAuthenticated, onSignInClick, onSignOut }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  const handleClick = () => {
    if (isAuthenticated) {
      setShowDropdown(!showDropdown);
    } else {
      onSignInClick();
    }
  };

  const handleSignOut = async () => {
    setShowDropdown(false);
    if (onSignOut) await onSignOut();
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <div className="user-avatar-container" ref={dropdownRef}>
      <button
        className="icon-btn user-avatar-btn"
        onClick={handleClick}
        title={isAuthenticated ? displayName : 'Sign in'}
        aria-label={isAuthenticated ? `Signed in as ${displayName}` : 'Sign in'}
      >
        {isAuthenticated && avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="user-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        )}
      </button>

      {showDropdown && isAuthenticated && (
        <div className="user-dropdown">
          <div className="user-dropdown-info">
            <span className="user-dropdown-name">{displayName}</span>
            {user?.email && (
              <span className="user-dropdown-email">{user.email}</span>
            )}
          </div>
          <div className="user-dropdown-badge">
            <span className="synced-badge">Synced ✓</span>
          </div>
          <button className="user-dropdown-signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserAvatar;
