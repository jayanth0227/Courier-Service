const { EventEmitter } = require('events');

class LiveEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200); // Allow multiple concurrent SSE connections
  }

  /**
   * Broadcast an event to all connected clients under a specific tenant
   * @param {string} tenantId - Tenant identifier
   * @param {string} eventType - e.g. 'BOOKING_CREATED', 'BOOKING_UPDATED', 'DISPATCH_UPDATED'
   * @param {object} payload - Event data payload
   */
  broadcast(tenantId, eventType, payload = {}) {
    const event = {
      type: eventType,
      data: payload,
      tenantId: tenantId ? String(tenantId) : null,
      timestamp: Date.now(),
    };

    if (tenantId) {
      this.emit(`tenant:${String(tenantId)}`, event);
    }
    // Also dispatch to platform-wide superadmin stream
    this.emit('platform:superadmin', event);
  }
}

const liveEmitter = new LiveEmitter();

module.exports = liveEmitter;
