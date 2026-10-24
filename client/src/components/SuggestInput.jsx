import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, CornerDownLeft, Sparkles } from 'lucide-react';

export const SuggestInput = ({
  id,
  name,
  label,
  required = false,
  value = '',
  onChange,
  onSelect,
  placeholder = '',
  suggestions = [],
  hint = '',
  icon: Icon,
  disabled = false,
  autoComplete = 'off',
  style = {},
  inputStyle = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync internal query with incoming value prop
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Handle outside clicks to close the dropdown
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

  // Normalize suggestions into { text, subtext }
  const normalizedSuggestions = suggestions
    .map((s) => {
      if (typeof s === 'string') return { text: s.trim() };
      if (s && typeof s === 'object') return { text: (s.text || s.label || s.value || '').trim(), subtext: s.subtext };
      return null;
    })
    .filter((s) => s && s.text.length > 0);

  // Filter matching suggestions
  const filteredSuggestions = normalizedSuggestions.filter((item) => {
    if (!trimmedQuery) return true;
    return item.text.toLowerCase().includes(trimmedQuery);
  });

  // Sort matching suggestions: items starting with query come first
  filteredSuggestions.sort((a, b) => {
    if (!trimmedQuery) return 0;
    const aLower = a.text.toLowerCase();
    const bLower = b.text.toLowerCase();
    const aStarts = aLower.startsWith(trimmedQuery);
    const bStarts = bLower.startsWith(trimmedQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return aLower.localeCompare(bLower);
  });

  // Limit suggestions list length
  const displaySuggestions = filteredSuggestions.slice(0, 10);

  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    setQuery(nextVal);
    setIsOpen(true);
    setActiveIndex(0);
    if (onChange) {
      onChange(nextVal);
    }
  };

  const handleSelectSuggestion = (selectedText) => {
    setQuery(selectedText);
    setIsOpen(false);
    setActiveIndex(0);
    if (onChange) {
      onChange(selectedText);
    }
    if (onSelect) {
      onSelect(selectedText);
    }
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    if (onChange) {
      onChange('');
    }
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && displaySuggestions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (displaySuggestions.length > 0) {
        setActiveIndex((prev) => (prev + 1 < displaySuggestions.length ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (displaySuggestions.length > 0) {
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : displaySuggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (displaySuggestions.length > 0 && activeIndex >= 0 && activeIndex < displaySuggestions.length) {
        e.preventDefault();
        e.stopPropagation();
        handleSelectSuggestion(displaySuggestions[activeIndex].text);
      }
    } else if (e.key === 'Tab') {
      if (displaySuggestions.length > 0 && activeIndex >= 0 && activeIndex < displaySuggestions.length) {
        handleSelectSuggestion(displaySuggestions[activeIndex].text);
      }
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Helper to highlight matching text
  const renderHighlighted = (text, match) => {
    if (!match) return text;
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(match);
    if (index === -1) return text;

    const before = text.substring(0, index);
    const matched = text.substring(index, index + match.length);
    const after = text.substring(index + match.length);

    return (
      <>
        {before}
        <strong style={{ color: '#1d4ed8', backgroundColor: '#dbeafe', borderRadius: '2px', padding: '0 2px' }}>
          {matched}
        </strong>
        {after}
      </>
    );
  };

  return (
    <div
      className="form-group"
      style={{ position: 'relative', marginBottom: 0, ...style }}
      ref={containerRef}
    >
      {label && (
        <label className="form-label" htmlFor={id} style={{ fontSize: '0.8125rem', marginBottom: '0.35rem', fontWeight: 600 }}>
          {label} {required && <span className="required">*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <Icon
            size={15}
            style={{
              position: 'absolute',
              left: '10px',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
        )}

        <input
          ref={inputRef}
          id={id}
          name={name || id}
          type="text"
          className="form-control"
          style={{
            paddingLeft: Icon ? '34px' : '12px',
            paddingRight: query ? '32px' : '12px',
            fontSize: '0.85rem',
            color: '#0f172a',
            ...inputStyle,
          }}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (displaySuggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          data-lpignore="true"
        />

        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            title="Clear"
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
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {hint && (
        <div className="form-hint" style={{ fontSize: '0.72rem', marginTop: '0.25rem', color: '#64748b' }}>
          {hint}
        </div>
      )}

      {/* Floating Suggestions Dropdown */}
      {isOpen && displaySuggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} color="#2563eb" /> Existing Suggestions ({displaySuggestions.length})
            </span>
            <span style={{ fontSize: '0.675rem', fontWeight: 500, color: '#94a3b8' }}>
              Click or Press ↵
            </span>
          </div>

          <div
            ref={listRef}
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {displaySuggestions.map((item, idx) => {
              const isSelected = (value || '').trim().toLowerCase() === item.text.toLowerCase();
              const isHighlighted = activeIndex === idx;

              return (
                <div
                  key={`${item.text}-${idx}`}
                  onClick={() => handleSelectSuggestion(item.text)}
                  style={{
                    padding: '7px 10px',
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
                    <span
                      style={{
                        fontWeight: isSelected ? 700 : 500,
                        color: isHighlighted ? '#1e40af' : '#0f172a',
                      }}
                    >
                      {renderHighlighted(item.text, trimmedQuery)}
                    </span>
                    {item.subtext && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#64748b',
                          backgroundColor: '#f1f5f9',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        {item.subtext}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {isHighlighted ? (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <CornerDownLeft size={9} /> Select
                      </span>
                    ) : isSelected ? (
                      <Check size={14} color="#2563eb" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
