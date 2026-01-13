import React, { useState, useMemo, useRef, useEffect } from 'react';

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
 *
 * Props:
 * - players: Array of player objects from all_players.json
 * - onSelectPlayer: Callback with player.id when selection is made
 * - disabled: Disables input when game is over
 * - usedPlayers: Set of already guessed player IDs to exclude
 */
export function PlayerAutocomplete({
  players,
  onSelectPlayer,
  disabled,
  usedPlayers = new Set()
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter players based on query (min 3 characters)
  const suggestions = useMemo(() => {
    if (query.length < 3) return [];

    const normalizedQuery = query.toLowerCase().trim();

    return players
      .filter(player => {
        // Skip already guessed players
        if (usedPlayers.has(player.id)) return false;

        // Search in fullName and country
        const searchText = `${player.fullName} ${player.country}`.toLowerCase();
        return searchText.includes(normalizedQuery);
      })
      .slice(0, 10); // Limit to 10 suggestions for performance
  }, [query, players, usedPlayers]);

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
  };

  const handleSelectPlayer = (player) => {
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
          onFocus={() => query.length >= 3 && setIsOpen(true)}
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
                <span className="player-role">{player.role}</span>
              </div>
              <span className="player-country">{player.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PlayerAutocomplete;
