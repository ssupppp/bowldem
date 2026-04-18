import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { trackFunnel } from '../lib/analytics.js';

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

/**
 * PlayerAutocomplete - Text input with autocomplete for player selection
 *
 * Core component for player input in the knowledge-based guessing game.
 * Replaces the old squad-selection UI with a searchable text field.
 *
 * Features:
 * - Minimum 3 characters required to trigger search (prevents overwhelming results)
 * - Searches by player fullName and country (case-insensitive)
 * - Keyboard navigation: ArrowUp/Down to navigate, Enter to select, Escape to close
 * - Auto-excludes already guessed players from suggestions
 * - Maximum 10 suggestions shown for performance
 * - Mobile-friendly with 16px font to prevent iOS zoom
 * - Prioritizes active T20 players (those in puzzles) over others
 *
 * Props:
 * - players: Array of player objects from all_players.json
 * - onSelectPlayer: Callback with player.id when selection is made
 * - disabled: Disables input when game is over
 * - usedPlayers: Set of already guessed player IDs to exclude
 * - priorityPlayerIds: Set of player IDs to prioritize in results (e.g., players in puzzles)
 * - feedbackList: Array of feedback objects from previous guesses (for smart ordering)
 */
export function PlayerAutocomplete({
  players,
  onSelectPlayer,
  disabled,
  usedPlayers = new Set(),
  priorityPlayerIds = new Set(),
  feedbackList = []
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fire each micro-funnel event only once per session
  const firedRef = useRef({ focused: false, typed: false, autocomplete: false, selected: false });

  // Derive known clues from feedback
  const knownClues = useMemo(() => {
    let role = null;
    let team = null;

    for (const fb of feedbackList) {
      if (fb.sameRole && !role) role = fb.role;
      if (fb.sameTeam && !team) team = fb.country;
    }

    return { role, team };
  }, [feedbackList]);

  // Filter and sort players based on query (min 3 characters)
  // Smart ordering: cracked clues drive priority
  const suggestions = useMemo(() => {
    if (query.length < 3) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const { role: knownRole, team: knownTeam } = knownClues;

    const filtered = players.filter(player => {
      // Skip already guessed players
      if (usedPlayers.has(player.id)) return false;

      // Search in fullName and country
      const searchText = `${player.fullName} ${player.country}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });

    // Score each player for smart ordering
    const scored = filtered.map(player => {
      let score = 0;

      // Priority players (in puzzles) get base boost
      if (priorityPlayerIds.has(player.id)) score += 100;

      const matchesTeam = knownTeam && player.country === knownTeam;
      const matchesRole = knownRole && player.role === knownRole;

      // Both cracked: team + role match is top tier
      if (knownTeam && knownRole) {
        if (matchesTeam && matchesRole) score += 2000;
        else if (matchesTeam) score += 1000;
        else if (matchesRole) score += 500;
      }
      // Only team cracked: sort by team first
      else if (knownTeam) {
        if (matchesTeam) score += 1000;
      }
      // Only role cracked: sort by role first
      else if (knownRole) {
        if (matchesRole) score += 1000;
      }

      return { player, score };
    });

    // Sort by score (descending), then alphabetically within same score
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.player.fullName.localeCompare(b.player.fullName);
    });

    return scored.map(s => s.player).slice(0, 10);
  }, [query, players, usedPlayers, priorityPlayerIds, knownClues]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current && highlightedIndex >= 0) {
      const items = dropdownRef.current.querySelectorAll('.autocomplete-item');
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

    // Micro-funnel: first keystroke
    if (value.length > 0 && !firedRef.current.typed) {
      firedRef.current.typed = true;
      trackFunnel.inputTyped();
    }
    // Micro-funnel: autocomplete dropdown about to show
    if (value.length >= 3 && !firedRef.current.autocomplete) {
      firedRef.current.autocomplete = true;
      trackFunnel.autocompleteShown(value);
    }
  };

  const handleFocus = () => {
    if (query.length >= 3) setIsOpen(true);
    if (!firedRef.current.focused) {
      firedRef.current.focused = true;
      trackFunnel.inputFocused();
    }
  };

  const handleSelectPlayer = (player) => {
    if (!firedRef.current.selected) {
      firedRef.current.selected = true;
      trackFunnel.playerSelected(player.fullName);
    }
    onSelectPlayer(player.id);
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
    // Delay to allow click on dropdown item
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className="autocomplete-container">
      <div className="autocomplete-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Type player name (min 3 letters)..."
          disabled={disabled}
          className="autocomplete-input"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        <span className="autocomplete-icon">
          {query.length >= 3 ? '🔍' : '🏏'}
        </span>
      </div>

      {/* Hint when typing */}
      {query.length > 0 && query.length < 3 && (
        <div className="autocomplete-hint">
          Type {3 - query.length} more character{3 - query.length > 1 ? 's' : ''} to search
        </div>
      )}

      {/* No results message */}
      {query.length >= 3 && suggestions.length === 0 && (
        <div className="autocomplete-no-results">
          No players found matching "{query}"
        </div>
      )}

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <ul className="autocomplete-dropdown" ref={dropdownRef}>
          {suggestions.map((player, index) => (
            <li
              key={player.id}
              className={`autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''}`}
              onMouseDown={() => handleSelectPlayer(player)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="player-info">
                <span className="player-name">{player.fullName}</span>
                <span className="player-role">{getCountryCode(player.country)}•{player.role}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PlayerAutocomplete;
