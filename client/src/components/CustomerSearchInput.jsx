import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Phone, Check, Search, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export const CustomerSearchInput = ({
  value = '',
  onChange,
  onSelectCustomer,
  onSelectNext,
  placeholder = 'e.g. Ramesh',
  required = false,
  autoFocus = false,
  id = 'cb_sender_name',
  name = 'cb_sender_name',
  tabIndex,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync internal query with external value prop
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search API for matching customers
  const searchCustomers = useCallback(async (searchTerm) => {
    const trimmed = (searchTerm || '').trim();
    if (!trimmed || trimmed.length < 1) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.customers.list({ search: trimmed, nameOnly: true, limit: 15 });
      if (res.success && Array.isArray(res.data)) {
        const lower = trimmed.toLowerCase();
        const matching = res.data.filter((c) => {
          const nameMatch = c.name && c.name.toLowerCase().includes(lower);
          const phoneMatch = c.phone && c.phone.includes(trimmed);
          return nameMatch || phoneMatch;
        });

        // Prioritize names starting with query
        matching.sort((a, b) => {
          const aName = (a.name || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          const aStarts = aName.startsWith(lower);
          const bStarts = bName.startsWith(lower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return aName.localeCompare(bName);
        });

        setSuggestions(matching);
        if (matching.length > 0) {
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setIsOpen(false);
        }
      }
    } catch (err) {
      console.error('Customer search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle typing in the input
  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    setQuery(nextVal);
    if (onChange) {
      onChange(nextVal);
    }

    // Debounce API calls for smooth typing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!nextVal.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      searchCustomers(nextVal);
    }, 180);
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

  // Handle customer selection
  const handleSelectCustomer = (customer) => {
    setQuery(customer.name);
    setIsOpen(false);
    setActiveIndex(0);

    if (onSelectCustomer) {
      onSelectCustomer(customer);
    } else if (onChange) {
      onChange(customer.name);
    }

    if (onSelectNext) {
      setTimeout(() => onSelectNext(), 50);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        if (onSelectNext) {
          e.preventDefault();
          onSelectNext();
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectCustomer(suggestions[activeIndex]);
      } else if (suggestions.length > 0) {
        handleSelectCustomer(suggestions[0]);
      }
    } else if (e.key === 'Tab') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectCustomer(suggestions[activeIndex]);
      }
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        className="form-control"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (query.trim() && suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        required={required}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        autoComplete="off"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        data-lpignore="true"
        data-form-type="other"
        style={{
          padding: '0.4rem 0.55rem',
          fontSize: '0.8125rem',
          backgroundColor: '#ffffff',
          width: '100%',
        }}
      />

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 3px)',
            left: 0,
            right: 0,
            minWidth: '240px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxShadow: '0 8px 24px -2px rgba(0, 0, 0, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.08)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div
            ref={listRef}
            style={{
              maxHeight: '210px',
              overflowY: 'auto',
              padding: '3px',
            }}
          >
            {suggestions.map((c, idx) => {
              const isSelected = (value || '').trim().toLowerCase() === (c.name || '').trim().toLowerCase();
              const isHighlighted = activeIndex === idx;

              return (
                <div
                  key={c._id || idx}
                  onClick={() => handleSelectCustomer(c)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: isHighlighted ? '#f1f5f9' : isSelected ? '#e2e8f0' : 'transparent',
                    borderLeft: isHighlighted ? '3px solid #2563eb' : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    gap: '6px',
                    transition: 'background-color 0.08s ease',
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <User
                      size={13}
                      color={isHighlighted ? '#2563eb' : isSelected ? '#2563eb' : '#64748b'}
                      style={{ flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontWeight: isHighlighted ? 700 : isSelected ? 700 : 600,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.name}
                    </span>
                    {c.phone && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        • {c.phone}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {c.totalBookings > 0 && (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          padding: '1px 5px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          color: '#475569',
                          fontWeight: 600,
                        }}
                      >
                        {c.totalBookings} orders
                      </span>
                    )}
                    {isSelected && <Check size={12} color="#16a34a" />}
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
