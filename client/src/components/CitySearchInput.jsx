import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X, Plus, Check, CornerDownLeft } from 'lucide-react';

export const CitySearchInput = ({
  label,
  value = '',
  onChange,
  onSelectNext,
  cities = [],
  placeholder = 'Search or enter city name...',
  required = false,
  autoFocus = false,
  helperText,
  disabled = false,
  id,
  name,
  tabIndex,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync internal query with external value prop
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Outside click closes dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = (query || '').trim().toLowerCase();

  // Filter cities strictly by city name (word-by-word prefix matching, excluding sub-stations/addresses)
  const filteredCities = cities.filter((c) => {
    if (!trimmedQuery) return true;
    if (!c.name) return false;
    const cityName = c.name.toLowerCase().trim();
    const words = cityName.split(/[\s,.-]+/);
    return cityName.startsWith(trimmedQuery) || words.some((w) => w.startsWith(trimmedQuery));
  });

  const exactMatch = cities.some((c) => (c.name || '').trim().toLowerCase() === trimmedQuery);
  const showCustomOption = query.trim() && !exactMatch;
  const totalOptions = filteredCities.length + (showCustomOption ? 1 : 0);

  // Auto-highlight first matching option whenever query changes
  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    setQuery(nextVal);
    setIsOpen(true);
    setActiveIndex(0);
    if (onChange) {
      const matched = cities.find((c) => (c.name || '').trim().toLowerCase() === nextVal.trim().toLowerCase());
      onChange(nextVal, matched || { name: nextVal, deliveryAddress: '', locations: [] });
    }
  };

  // Scroll active item into view during arrow key navigation
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex];
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const handleSelectCity = (city) => {
    setQuery(city.name);
    setIsOpen(false);
    setActiveIndex(0);
    if (onChange) {
      onChange(city.name, city);
    }
    if (onSelectNext) {
      setTimeout(() => onSelectNext(), 50);
    }
  };

  const handleCustomCity = () => {
    const customName = query.trim();
    if (!customName) return;
    setQuery(customName);
    setIsOpen(false);
    setActiveIndex(0);
    if (onChange) {
      onChange(customName, { name: customName, deliveryAddress: '', locations: [] });
    }
    if (onSelectNext) {
      setTimeout(() => onSelectNext(), 50);
    }
  };

  // Keyboard navigation with Arrow keys, Enter, Tab, and Escape
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
        return;
      }
      if (e.key === 'Enter') {
        if (query.trim() && onSelectNext) {
          e.preventDefault();
          onSelectNext();
        }
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalOptions > 0) {
        setActiveIndex((prev) => (prev + 1 < totalOptions ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalOptions > 0) {
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalOptions - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (activeIndex >= 0 && activeIndex < filteredCities.length) {
        handleSelectCity(filteredCities[activeIndex]);
      } else if (activeIndex === filteredCities.length && showCustomOption) {
        handleCustomCity();
      } else if (filteredCities.length > 0) {
        handleSelectCity(filteredCities[0]);
      } else if (showCustomOption) {
        handleCustomCity();
      } else {
        setIsOpen(false);
        if (onSelectNext) onSelectNext();
      }
    } else if (e.key === 'Tab') {
      // Tab selection
      if (isOpen && totalOptions > 0) {
        if (activeIndex >= 0 && activeIndex < filteredCities.length) {
          handleSelectCity(filteredCities[activeIndex]);
        } else if (showCustomOption && activeIndex === filteredCities.length) {
          handleCustomCity();
        } else if (filteredCities.length === 1) {
          handleSelectCity(filteredCities[0]);
        }
      }
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="form-group" style={{ position: 'relative', marginBottom: 0 }} ref={containerRef}>
      {label && (
        <label className="form-label" htmlFor={id} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '10px',
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        />

        <input
          ref={inputRef}
          id={id}
          name={name || `search_dest_input_${id || 'city'}`}
          type="text"
          className={`form-control ${error ? 'input-error' : ''}`}
          style={{
            paddingLeft: '32px',
            paddingRight: query ? '30px' : '12px',
            fontSize: '0.8125rem',
            paddingTop: '0.45rem',
            paddingBottom: '0.45rem',
            fontWeight: 600,
            color: '#0f172a',
            backgroundColor: '#ffffff',
          }}
          placeholder={placeholder || 'Type destination city name...'}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (trimmedQuery.length > 0) {
              setIsOpen(true);
              setActiveIndex(0);
            }
          }}
          onKeyDown={handleKeyDown}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          tabIndex={tabIndex}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          data-lpignore="true"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              if (onChange) onChange('', null);
              inputRef.current?.focus();
            }}
            tabIndex={-1}
            title="Clear search"
            style={{
              position: 'absolute',
              right: '8px',
              border: 'none',
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'background-color 0.15s ease',
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {helperText && (
        <div className="form-hint" style={{ marginTop: '2px', fontSize: '0.6875rem' }}>
          {helperText}
        </div>
      )}

      {/* Floating Suggestions Dropdown (Appears only during active typing / searching) */}
      {isOpen && trimmedQuery.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Matching Destination Cities ({filteredCities.length})</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#94a3b8' }}>Press ↵ to select</span>
          </div>

          <div
            ref={listRef}
            style={{
              maxHeight: '210px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {filteredCities.length === 0 && (
              <div style={{ padding: '10px 12px', color: '#64748b', fontSize: '0.75rem' }}>
                No registered hub matching <strong>"{query.trim()}"</strong>
              </div>
            )}

            {filteredCities.map((c, idx) => {
              const isSelected = (value || '').trim().toLowerCase() === (c.name || '').trim().toLowerCase();
              const isHighlighted = activeIndex === idx;
              const locList =
                Array.isArray(c.locations) && c.locations.length > 0
                  ? c.locations
                  : c.deliveryAddress
                  ? [c.deliveryAddress]
                  : [];
              const locText = locList.join(' • ');

              return (
                <div
                  key={c._id || c.name || idx}
                  onClick={() => handleSelectCity(c)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isHighlighted ? '#eff6ff' : isSelected ? '#f1f5f9' : 'transparent',
                    borderLeft: isHighlighted ? '3px solid #2563eb' : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    gap: '8px',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <MapPin
                      size={14}
                      color={isHighlighted ? '#2563eb' : isSelected ? '#2563eb' : '#64748b'}
                      style={{ flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontWeight: 700,
                        color: isHighlighted ? '#1e40af' : '#0f172a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.name}
                    </span>
                    {locText && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#475569',
                          backgroundColor: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={locText}
                      >
                        {locText}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {isHighlighted ? (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <CornerDownLeft size={10} /> Select
                      </span>
                    ) : isSelected ? (
                      <Check size={14} color="#2563eb" />
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* Custom city option at bottom if user typed a name not in list */}
            {showCustomOption && (
              <div
                onClick={handleCustomCity}
                style={{
                  padding: '8px 10px',
                  marginTop: '4px',
                  borderTop: filteredCities.length > 0 ? '1px solid #e2e8f0' : 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  color: '#0f172a',
                  fontSize: '0.78125rem',
                  fontWeight: 600,
                  backgroundColor: activeIndex === filteredCities.length ? '#eff6ff' : '#f8fafc',
                  borderLeft: activeIndex === filteredCities.length ? '3px solid #2563eb' : '3px solid transparent',
                }}
                onMouseEnter={() => setActiveIndex(filteredCities.length)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} color="#2563eb" />
                  <span>
                    Use custom destination <strong>"{query.trim()}"</strong>
                  </span>
                </div>
                {activeIndex === filteredCities.length && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <CornerDownLeft size={10} /> Enter
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {error && <div className="form-error-msg">{error}</div>}
    </div>
  );
};
