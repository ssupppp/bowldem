import React, { useState, useMemo, useRef, useEffect } from 'react';

/**
 * PlayerAutocomplete - Enhanced Text Input with Autocomplete
 *
 * Core component for player input with improved UX:
 * - Minimum 3 characters to trigger search
 * - Keyboard navigation with visual indicators
 * - Clear button when input has value
 * - Touch-friendly with 44px+ targets
 * - Country display in suggestions
 * - Mobile-friendly with 16px font (prevents iOS zoom)
 */

// Country flag emoji mapping
const COUNTRY_FLAGS = {
  'India': '🇮🇳',
  'Australia': '🇦🇺',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'South Africa': '🇿🇦',
  'New Zealand': '🇳🇿',
  'Pakistan': '🇵🇰',
  'Sri Lanka': '🇱🇰',
  'Bangladesh': '🇧🇩',
  'West Indies': '🏝️',
  'Afghanistan': '🇦🇫',
  'Ireland': '🇮🇪',
  'Zimbabwe': '🇿🇼',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Netherlands': '🇳🇱',
  'Namibia': '🇳🇦',
  'UAE': '🇦🇪',
  'USA': '🇺🇸',
  'Oman': '🇴🇲',
  'Nepal': '🇳🇵',
  'Canada': '🇨🇦',
  'Uganda': '🇺🇬',
  'Papua New Guinea': '🇵🇬',
};

function getCountryFlag(country) {
  return COUNTRY_FLAGS[country] || '🏏';
}

// 3-letter country code mapping
const COUNTRY_CODES = {
  'India': 'IND',
  'Australia': 'AUS',
  'England': 'ENG',
  'Pakistan': 'PAK',
  'South Africa': 'RSA',
  'New Zealand': 'NZL',
  'Sri Lanka': 'SRL',
  'Bangladesh': 'BAN',
  'West Indies': 'WIN',
  'Afghanistan': 'AFG',
  'Ireland': 'IRE',
  'Zimbabwe': 'ZIM',
  'Scotland': 'SCO',
  'Netherlands': 'NED',
  'Namibia': 'NAM',
  'UAE': 'UAE',
  'USA': 'USA',
  'Oman': 'OMA',
  'Nepal': 'NEP',
  'Canada': 'CAN',
  'Uganda': 'UGA',
  'Papua New Guinea': 'PNG',
};

function getCountryCode(country) {
  return COUNTRY_CODES[country] || country?.slice(0, 3).toUpperCase() || '';
}

export function PlayerAutocomplete({
  players,
  onSelectPlayer,
  disabled,
  usedPlayers = new Set(),
  priorityPlayerIds = new Set()
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter and sort players based on query (min 3 characters)
  const suggestions = useMemo(() => {
    if (query.length < 3) return [];

    // Simulate brief search delay for UX feedback
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 100);

    const normalizedQuery = query.toLowerCase().trim();

    const filtered = players.filter(player => {
      if (usedPlayers.has(player.id)) return false;

      const normalizedName = player.fullName.toLowerCase();
      const normalizedCountry = player.country.toLowerCase();

      // Country must be exact match OR prefix match (e.g., "usa" matches "USA", "ind" matches "India")
      const countryMatch = normalizedCountry === normalizedQuery ||
                           normalizedCountry.startsWith(normalizedQuery);
      // Name can be substring match
      const nameMatch = normalizedName.includes(normalizedQuery);

      return countryMatch || nameMatch;
    });

    return filtered
      .sort((a, b) => {
        const aPriority = priorityPlayerIds.has(a.id);
        const bPriority = priorityPlayerIds.has(b.id);
        if (aPriority && !bPriority) return -1;
        if (!aPriority && bPriority) return 1;
        return a.fullName.localeCompare(b.fullName);
      })
      .slice(0, 10);
  }, [query, players, usedPlayers, priorityPlayerIds]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current && highlightedIndex >= 0) {
      const items = dropdownRef.current.querySelectorAll('[role="option"]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length >= 3);
    setHighlightedIndex(0);
  };

  const handleSelectPlayer = (player) => {
    onSelectPlayer(player.id);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelectPlayer(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
  };

  const showDropdown = isOpen && suggestions.length > 0;

  return (
    <div className="relative w-full">
      {/* Input wrapper */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          onBlur={handleBlur}
          placeholder="Type player name (min 3 letters)..."
          disabled={disabled}
          className={`
            w-full pl-12 pr-12 py-4
            text-base sm:text-lg
            bg-white rounded-xl
            border-2 transition-all duration-200
            placeholder-slate-400
            focus:outline-none
            disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
            ${showDropdown
              ? 'border-blue-500 ring-2 ring-blue-100 rounded-b-none'
              : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }
          `}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-controls="player-listbox"
          aria-autocomplete="list"
        />

        {/* Left icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
          {isSearching ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : query.length >= 3 ? (
            '🔍'
          ) : (
            '🏏'
          )}
        </div>

        {/* Clear button */}
        {query.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2
                       w-8 h-8 flex items-center justify-center
                       text-slate-400 hover:text-slate-600
                       hover:bg-slate-100 rounded-full
                       transition-colors duration-150
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Clear search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Character hint */}
      {query.length > 0 && query.length < 3 && (
        <div className="mt-2 text-sm text-slate-500 text-center animate-fade-in">
          Type {3 - query.length} more character{3 - query.length > 1 ? 's' : ''} to search
        </div>
      )}

      {/* No results message */}
      {query.length >= 3 && suggestions.length === 0 && !isSearching && (
        <div className="mt-2 p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
          <div className="text-2xl mb-2">🤔</div>
          No players found matching "<span className="font-medium">{query}</span>"
        </div>
      )}

      {/* Dropdown suggestions */}
      {showDropdown && (
        <ul
          id="player-listbox"
          ref={dropdownRef}
          role="listbox"
          className="absolute z-50 w-full bg-white
                     border-2 border-t-0 border-blue-500
                     rounded-b-xl shadow-lg
                     max-h-72 overflow-y-auto
                     animate-fade-in"
        >
          {suggestions.map((player, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={player.id}
                role="option"
                aria-selected={isHighlighted}
                className={`
                  flex items-center gap-3 px-4 py-3
                  cursor-pointer transition-colors duration-100
                  min-h-[56px]
                  ${isHighlighted
                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }
                  ${index !== suggestions.length - 1 ? 'border-b border-slate-100' : ''}
                `}
                onMouseDown={() => handleSelectPlayer(player)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {/* Country flag */}
                <span className="text-xl flex-shrink-0">
                  {getCountryFlag(player.country)}
                </span>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold truncate ${isHighlighted ? 'text-blue-900' : 'text-slate-800'}`}>
                    {player.fullName}
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="font-medium">{getCountryCode(player.country)}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400">{player.role}</span>
                  </div>
                </div>

                {/* Keyboard hint for highlighted item */}
                {isHighlighted && (
                  <div className="flex-shrink-0 hidden sm:flex items-center gap-1 text-xs text-slate-400">
                    <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono">↵</kbd>
                  </div>
                )}
              </li>
            );
          })}

          {/* Keyboard navigation hint */}
          <div className="hidden sm:flex items-center justify-center gap-4 px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded shadow-sm font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white rounded shadow-sm font-mono">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded shadow-sm font-mono">↵</kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded shadow-sm font-mono">esc</kbd>
              <span>to close</span>
            </span>
          </div>
        </ul>
      )}
    </div>
  );
}

export default PlayerAutocomplete;
