/**
 * Icon Component
 *
 * Renders SVG icons for UI buttons
 * Uses path definitions from icons.js
 *
 * Usage:
 *   <Icon name="close" size={24} />
 *   <Icon name="help" size={20} color="#333" />
 */

import React from 'react';
import { icons } from './icons.js';

export function Icon({
  name,
  size = 24,
  color,
  className = '',
  style = {},
  ...props
}) {
  const iconData = icons[name];

  if (!iconData) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  const svgStyle = {
    width: size,
    height: size,
    ...style
  };

  // Handle single path icons
  if (iconData.path) {
    return (
      <svg
        viewBox={iconData.viewBox}
        className={`icon icon-${name} ${className}`}
        style={svgStyle}
        aria-hidden="true"
        {...props}
      >
        <path
          d={iconData.path}
          fill={iconData.fill || 'none'}
          stroke={color || iconData.stroke || 'currentColor'}
          strokeWidth={iconData.strokeWidth || 2}
          strokeLinecap={iconData.strokeLinecap || 'round'}
          strokeLinejoin={iconData.strokeLinejoin || 'round'}
        />
      </svg>
    );
  }

  // Handle multi-path icons
  if (iconData.paths) {
    return (
      <svg
        viewBox={iconData.viewBox}
        className={`icon icon-${name} ${className}`}
        style={svgStyle}
        aria-hidden="true"
        {...props}
      >
        {iconData.paths.map((pathData, index) => (
          <path
            key={index}
            d={pathData.d}
            fill={pathData.fill || 'none'}
            stroke={color || pathData.stroke || 'currentColor'}
            strokeWidth={pathData.strokeWidth || 2}
            strokeLinecap={pathData.strokeLinecap || 'round'}
            strokeLinejoin={pathData.strokeLinejoin || 'round'}
          />
        ))}
      </svg>
    );
  }

  return null;
}

export default Icon;
