/**
 * Bowldem Analytics Module
 *
 * Tracks user interactions, game events, and funnel progression.
 * Events are batched and sent to Supabase for analysis.
 *
 * Event Categories:
 * - page_view: Page/screen views
 * - game: Game-related events (start, guess, win, lose)
 * - feature: Feature usage (archive, leaderboard, share, etc.)
 * - button: Button taps/clicks
 * - funnel: Conversion funnel events
 */

import { supabase } from './supabase.js';

// Configuration
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY = 'bowldem_analytics_queue';

// Skip analytics in development/localhost to avoid polluting production data
const IS_DEV_ENVIRONMENT = import.meta.env.DEV ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('localhost');

// Session and device tracking
let sessionId = null;
let deviceId = null;

// Player/visitor info cache
let visitorInfo = null;

/**
 * Get visitor info from IP (geolocation, etc.)
 */
async function fetchVisitorInfo() {
  try {
    // Use ipapi.co for free IP geolocation (1000 requests/day free)
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
        countryCode: data.country_code,
        timezone: data.timezone,
        isp: data.org,
        asn: data.asn
      };
    }
  } catch (e) {
    console.warn('[Analytics] Failed to fetch visitor info:', e);
  }
  return null;
}

/**
 * Generate browser fingerprint for identity tracking
 */
function generateFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(','),
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency,
    navigator.deviceMemory,
    navigator.platform,
    // Canvas fingerprint (simplified)
    (() => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Bowldem', 2, 2);
        return canvas.toDataURL().slice(-50);
      } catch {
        return 'no-canvas';
      }
    })()
  ];

  // Simple hash function
  const str = components.filter(Boolean).join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

/**
 * Initialize analytics - call on app start
 */
export async function initAnalytics() {
  // Skip full initialization in dev mode
  if (IS_DEV_ENVIRONMENT) {
    console.log('[Analytics] Dev environment detected - analytics disabled');
    console.log('[Analytics] To test analytics, deploy to production or set window.FORCE_ANALYTICS = true');
    // Still set up device ID for leaderboard functionality
    deviceId = localStorage.getItem('bowldem_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('bowldem_device_id', deviceId);
    }
    sessionId = 'session_dev_' + Date.now();
    return;
  }

  // Get or create device ID
  deviceId = localStorage.getItem('bowldem_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('bowldem_device_id', deviceId);
  }

  // Create new session ID
  sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

  // Generate fingerprint for identity tracking
  const fingerprint = generateFingerprint();

  // Check if returning visitor
  const visitCount = parseInt(localStorage.getItem('bowldem_visit_count') || '0') + 1;
  localStorage.setItem('bowldem_visit_count', visitCount.toString());

  const lastVisit = localStorage.getItem('bowldem_last_visit');
  const now = new Date().toISOString();
  localStorage.setItem('bowldem_last_visit', now);

  // Fetch visitor info (IP, location) asynchronously
  fetchVisitorInfo().then(info => {
    visitorInfo = info;
    if (info) {
      // Track visitor info separately for privacy
      trackEvent('session', 'visitor_info', {
        country: info.country,
        countryCode: info.countryCode,
        city: info.city,
        region: info.region,
        timezone: info.timezone
      });
    }
  });

  // Track session start with device details
  trackEvent('session', 'start', {
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    platform: navigator.platform,
    language: navigator.language,
    fingerprint,
    visitCount,
    lastVisit,
    isReturning: visitCount > 1,
    // Device capabilities
    touchSupport: 'ontouchstart' in window,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    connectionType: navigator.connection?.effectiveType,
    deviceMemory: navigator.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency
  });

  // Set up periodic flush
  setInterval(flushEvents, FLUSH_INTERVAL);

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    flushEvents(true); // Sync flush
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      trackEvent('session', 'background');
      flushEvents(true);
    } else {
      trackEvent('session', 'foreground');
    }
  });

  console.log('[Analytics] Initialized', { deviceId, sessionId });
}

/**
 * Track an event
 * @param {string} category - Event category (page_view, game, feature, button, funnel)
 * @param {string} action - Event action (e.g., 'click', 'start', 'complete')
 * @param {Object} properties - Additional event properties
 */
export function trackEvent(category, action, properties = {}) {
  // Skip tracking in dev/localhost to avoid polluting production data
  if (IS_DEV_ENVIRONMENT) {
    console.log('[Analytics] DEV MODE - Not tracking:', category, action, properties);
    return;
  }

  const event = {
    id: 'evt_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    device_id: deviceId,
    session_id: sessionId,
    category,
    action,
    properties: {
      ...properties,
      url: window.location.pathname,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight
    }
  };

  // Add to queue
  addToQueue(event);

  // Auto-flush if queue is full
  const queue = getQueue();
  if (queue.length >= BATCH_SIZE) {
    flushEvents();
  }
}

/**
 * Track page view
 * @param {string} pageName - Name of the page/screen
 * @param {Object} properties - Additional properties
 */
export function trackPageView(pageName, properties = {}) {
  trackEvent('page_view', pageName, properties);
}

/**
 * Track button tap/click
 * @param {string} buttonName - Name/identifier of the button
 * @param {Object} properties - Additional properties
 */
export function trackButtonTap(buttonName, properties = {}) {
  trackEvent('button', 'tap', { button_name: buttonName, ...properties });
}

/**
 * Track game events
 */
export const trackGame = {
  start: (puzzleNumber, puzzleDate) => {
    trackEvent('game', 'start', { puzzle_number: puzzleNumber, puzzle_date: puzzleDate });
    trackEvent('funnel', 'game_started', { puzzle_number: puzzleNumber });
  },

  guess: (guessNumber, playerName, feedback) => {
    trackEvent('game', 'guess', {
      guess_number: guessNumber,
      player_name: playerName,
      played_in_match: feedback?.playedInGame,
      same_team: feedback?.sameTeam,
      same_role: feedback?.sameRole,
      is_correct: feedback?.isMVP
    });
    trackEvent('funnel', `guess_${guessNumber}`, { player_name: playerName });
  },

  win: (puzzleNumber, guessesUsed) => {
    trackEvent('game', 'win', { puzzle_number: puzzleNumber, guesses_used: guessesUsed });
    trackEvent('funnel', 'game_won', { guesses_used: guessesUsed });
  },

  lose: (puzzleNumber, guessesUsed) => {
    trackEvent('game', 'lose', { puzzle_number: puzzleNumber, guesses_used: guessesUsed });
    trackEvent('funnel', 'game_lost', { guesses_used: guessesUsed });
  },

  return: (puzzleNumber, gameStatus) => {
    trackEvent('game', 'return', { puzzle_number: puzzleNumber, game_status: gameStatus });
  }
};

/**
 * Track feature usage
 */
export const trackFeature = {
  tutorialViewed: () => trackEvent('feature', 'tutorial_viewed'),
  tutorialSkipped: () => trackEvent('feature', 'tutorial_skipped'),
  tutorialCompleted: () => trackEvent('feature', 'tutorial_completed'),

  howToPlayOpened: () => trackEvent('feature', 'how_to_play_opened'),
  statsOpened: () => trackEvent('feature', 'stats_opened'),

  archiveOpened: () => trackEvent('feature', 'archive_opened'),
  archivePuzzleSelected: (puzzleNumber) => trackEvent('feature', 'archive_puzzle_selected', { puzzle_number: puzzleNumber }),

  leaderboardOpened: () => trackEvent('feature', 'leaderboard_opened'),
  leaderboardSubmitted: (rank) => trackEvent('feature', 'leaderboard_submitted', { rank }),

  shareX: () => trackEvent('feature', 'share_x'),
  shareWhatsApp: () => trackEvent('feature', 'share_whatsapp'),
  shareCopy: () => trackEvent('feature', 'share_copy'),

  notificationOptInShown: () => trackEvent('feature', 'notification_optin_shown'),
  notificationOptInCompleted: (channel) => trackEvent('feature', 'notification_optin_completed', { channel }),
  notificationOptInDismissed: () => trackEvent('feature', 'notification_optin_dismissed')
};

/**
 * Track funnel events
 */
export const trackFunnel = {
  // Onboarding funnel
  appOpened: () => trackEvent('funnel', 'app_opened'),
  tutorialSeen: () => trackEvent('funnel', 'tutorial_seen'),
  firstGuess: () => trackEvent('funnel', 'first_guess'),
  gameCompleted: (won) => trackEvent('funnel', 'game_completed', { won }),

  // Engagement funnel
  returnVisit: (daysAgo) => trackEvent('funnel', 'return_visit', { days_since_last: daysAgo }),
  streakActive: (streakLength) => trackEvent('funnel', 'streak_active', { streak_length: streakLength }),

  // Monetization funnel (future)
  leaderboardJoined: () => trackEvent('funnel', 'leaderboard_joined'),
  notificationEnabled: () => trackEvent('funnel', 'notification_enabled'),
  shareCompleted: () => trackEvent('funnel', 'share_completed')
};

// ============================================================================
// Internal queue management
// ============================================================================

function getQueue() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[Analytics] Failed to save queue:', e);
  }
}

function addToQueue(event) {
  const queue = getQueue();
  queue.push(event);
  saveQueue(queue);
}

async function flushEvents(sync = false) {
  const queue = getQueue();
  if (queue.length === 0) return;

  // Clear queue immediately to prevent duplicates
  saveQueue([]);

  if (!supabase) {
    console.warn('[Analytics] Supabase not configured, events dropped');
    return;
  }

  try {
    // Use sendBeacon for sync flush (page unload)
    if (sync && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ events: queue })], { type: 'application/json' });
      // Note: sendBeacon to Supabase requires a custom endpoint
      // For now, fall back to regular insert
    }

    // Insert events to Supabase
    const { error } = await supabase
      .from('analytics_events')
      .insert(queue.map(event => ({
        event_id: event.id,
        device_id: event.device_id,
        session_id: event.session_id,
        category: event.category,
        action: event.action,
        properties: event.properties,
        created_at: event.timestamp
      })));

    if (error) {
      console.error('[Analytics] Failed to send events:', error);
      // Re-add failed events to queue
      const currentQueue = getQueue();
      saveQueue([...queue, ...currentQueue]);
    } else {
      console.log('[Analytics] Flushed', queue.length, 'events');
    }
  } catch (e) {
    console.error('[Analytics] Error flushing events:', e);
    // Re-add failed events to queue
    const currentQueue = getQueue();
    saveQueue([...queue, ...currentQueue]);
  }
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Get device ID (for leaderboard, etc.)
 */
export function getDeviceId() {
  if (!deviceId) {
    deviceId = localStorage.getItem('bowldem_device_id');
  }
  return deviceId;
}

/**
 * Get session ID
 */
export function getSessionId() {
  return sessionId;
}

/**
 * Get analytics summary (for debugging)
 */
export function getAnalyticsSummary() {
  const queue = getQueue();
  return {
    deviceId,
    sessionId,
    queuedEvents: queue.length,
    lastEvent: queue[queue.length - 1] || null
  };
}

/**
 * Check if analytics is enabled (not in dev mode)
 */
export function isAnalyticsEnabled() {
  return !IS_DEV_ENVIRONMENT;
}

/**
 * Check Supabase connectivity - useful for debugging
 * Returns { connected: boolean, error?: string }
 */
export async function checkSupabaseConnection() {
  if (!supabase) {
    return { connected: false, error: 'Supabase client not initialized - check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
  }

  try {
    // Try a simple query to test connectivity
    const { error } = await supabase
      .from('analytics_events')
      .select('id')
      .limit(1);

    if (error) {
      return { connected: false, error: error.message };
    }

    return { connected: true };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

export default {
  init: initAnalytics,
  trackEvent,
  trackPageView,
  trackButtonTap,
  trackGame,
  trackFeature,
  trackFunnel,
  getDeviceId,
  getSessionId,
  getAnalyticsSummary,
  isAnalyticsEnabled,
  checkSupabaseConnection
};
