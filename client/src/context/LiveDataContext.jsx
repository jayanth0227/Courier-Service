import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const LiveDataContext = createContext(null);

export const LiveDataProvider = ({ children }) => {
  const { isAuthenticated, user, isImpersonating } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const listenersRef = useRef(new Map());
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Subscribe to specific real-time event types (e.g. 'BOOKING_CREATED', 'BOOKING_UPDATED')
   * @param {string} eventType - Event type name or '*' for all
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe cleanup function
   */
  const subscribeToEvent = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType).add(callback);

    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  /**
   * Dispatches event payload to all subscribed listeners and updates lastEvent
   */
  const dispatchEvent = useCallback((event) => {
    if (!event || !event.type) return;

    setLastEvent(event);

    // Call specific listeners
    const specific = listenersRef.current.get(event.type);
    if (specific) {
      specific.forEach((cb) => {
        try {
          cb(event.data, event);
        } catch (err) {
          console.error(`Error in live listener for ${event.type}:`, err);
        }
      });
    }

    // Call wildcard listeners
    const wildcards = listenersRef.current.get('*');
    if (wildcards) {
      wildcards.forEach((cb) => {
        try {
          cb(event.data, event);
        } catch (err) {
          console.error('Error in wildcard live listener:', err);
        }
      });
    }
  }, []);

  /**
   * Local instant dispatch for 0ms optimistic UI updates across modules
   */
  const notifyLocalChange = useCallback((type, data) => {
    dispatchEvent({
      type,
      data,
      timestamp: Date.now(),
      isLocal: true,
    });
  }, [dispatchEvent]);

  // Connect Server-Sent Events stream
  useEffect(() => {
    // Only connect tenant live stream for tenant users or when superadmin is impersonating a tenant.
    // Platform Super Admin in SaaS management mode does not connect to tenant booking streams.
    const shouldConnect = isAuthenticated && (user?.tenantId || isImpersonating || user?.role !== 'superadmin');

    if (!shouldConnect) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const connectSSE = () => {
      const token = localStorage.getItem('courier_token');
      if (!token) return;

      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const url = `/api/live/stream?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        es.onmessage = (messageEvent) => {
          try {
            if (!messageEvent.data || messageEvent.data.trim() === '') return;
            const parsed = JSON.parse(messageEvent.data);
            if (parsed.type === 'CONNECTED') {
              setIsConnected(true);
            } else {
              dispatchEvent(parsed);
            }
          } catch (err) {
            // Heartbeats or non-JSON comments pass silently
          }
        };

        es.onerror = () => {
          setIsConnected(false);
          es.close();

          reconnectAttemptsRef.current += 1;
          // Exponential / capped backoff up to 5 attempts
          if (reconnectAttemptsRef.current <= 5) {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              const stillShouldConnect = isAuthenticated && (user?.tenantId || isImpersonating || user?.role !== 'superadmin');
              if (stillShouldConnect) {
                connectSSE();
              }
            }, Math.min(30000, 3000 * reconnectAttemptsRef.current));
          }
        };
      } catch (err) {
        console.error('Failed to establish SSE live stream:', err);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.tenantId, user?.role, isImpersonating, dispatchEvent]);

  return (
    <LiveDataContext.Provider
      value={{
        isConnected,
        lastEvent,
        subscribeToEvent,
        notifyLocalChange,
      }}
    >
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (!context) {
    return {
      isConnected: false,
      lastEvent: null,
      subscribeToEvent: () => () => {},
      notifyLocalChange: () => {},
    };
  }
  return context;
};
