/**
 * SVG Icon Path Definitions
 *
 * SVG icons for UI buttons - keeping emojis for content (medals, cricket)
 * All paths are 24x24 viewBox by default
 */

export const icons = {
  // Close/X icon
  close: {
    viewBox: '0 0 24 24',
    path: 'M18 6L6 18M6 6l12 12',
    strokeWidth: 2,
    fill: 'none',
    stroke: 'currentColor'
  },

  // Help/Question mark
  help: {
    viewBox: '0 0 24 24',
    path: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6v.01M12 8a2 2 0 00-1.82 1.178c-.12.257-.18.54-.18.822 0 .45.27.85.67 1.03a2.5 2.5 0 01.33.17v1.8',
    strokeWidth: 2,
    fill: 'none',
    stroke: 'currentColor'
  },

  // Simplified help (question mark circle)
  helpCircle: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', stroke: 'currentColor', fill: 'none', strokeWidth: 2 },
      { d: 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3', stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' },
      { d: 'M12 17h.01', stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }
    ]
  },

  // Stats/Chart icon
  stats: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M18 20V10', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M12 20V4', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M6 20v-6', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },

  // Trophy/Leaderboard icon
  trophy: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 21h8', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M12 17v4', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M7 4h10l-1 8a5 5 0 01-4 4 5 5 0 01-4-4L7 4z', stroke: 'currentColor', strokeWidth: 2, fill: 'none' },
      { d: 'M5 4h2M17 4h2', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' },
      { d: 'M5 4v2a2 2 0 002 2M19 4v2a2 2 0 01-2 2', stroke: 'currentColor', strokeWidth: 2 }
    ]
  },

  // Archive/Book icon
  archive: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 19.5A2.5 2.5 0 016.5 17H20', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z', stroke: 'currentColor', strokeWidth: 2, fill: 'none' }
    ]
  },

  // Back arrow
  arrowLeft: {
    viewBox: '0 0 24 24',
    path: 'M19 12H5m0 0l7 7m-7-7l7-7',
    strokeWidth: 2,
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  },

  // Share icon
  share: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M16 6l-4-4-4 4', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M12 2v13', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },

  // Copy icon
  copy: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M9 9V5a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-4', stroke: 'currentColor', strokeWidth: 2, fill: 'none' },
      { d: 'M3 11a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z', stroke: 'currentColor', strokeWidth: 2, fill: 'none' }
    ]
  },

  // Check icon
  check: {
    viewBox: '0 0 24 24',
    path: 'M20 6L9 17l-5-5',
    strokeWidth: 2,
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  },

  // Settings/gear icon
  settings: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 15a3 3 0 100-6 3 3 0 000 6z', stroke: 'currentColor', strokeWidth: 2, fill: 'none' },
      { d: 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z', stroke: 'currentColor', strokeWidth: 2, fill: 'none' }
    ]
  },

  // External link
  externalLink: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6', stroke: 'currentColor', strokeWidth: 2 },
      { d: 'M15 3h6v6', stroke: 'currentColor', strokeWidth: 2 },
      { d: 'M10 14L21 3', stroke: 'currentColor', strokeWidth: 2 }
    ]
  }
};

export default icons;
