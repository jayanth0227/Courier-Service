const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const liveEmitter = require('../services/liveEmitter');

/**
 * @route   GET /api/live/stream
 * @desc    Server-Sent Events (SSE) real-time stream scoped to the authenticated tenant
 * @access  Private (JWT via Bearer header or ?token= query parameter)
 */
router.get('/stream', protect, (req, res) => {
  const isSuperAdmin = req.user?.role === 'superadmin';
  const tenantId = req.tenantId;

  if (!tenantId && !isSuperAdmin) {
    return res.status(400).json({ success: false, message: 'Tenant identifier missing' });
  }

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Prevent connection timeout in Node.js
  req.socket.setTimeout(0);
  res.flushHeaders?.();

  const channel = tenantId ? `tenant:${String(tenantId)}` : 'platform:superadmin';

  // Handle socket error gracefully without throwing
  req.socket.on('error', () => {
    // Client disconnect or socket reset handled silently
  });

  res.on('error', () => {
    // Socket write error handled silently
  });

  // Send initial connection handshake
  try {
    if (!res.writableEnded && req.socket && !req.socket.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now(), tenantId: tenantId ? String(tenantId) : 'platform' })}\n\n`);
    }
  } catch {
    // Handshake failed if client already disconnected
  }

  // Event handler for live broadcasts
  const handleLiveEvent = (event) => {
    try {
      if (!res.writableEnded && req.socket && !req.socket.destroyed) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      // Ignored if socket was reset
    }
  };

  liveEmitter.on(channel, handleLiveEvent);

  // Periodic heartbeat to keep HTTP connection alive and prevent proxy timeouts
  const heartbeatTimer = setInterval(() => {
    try {
      if (!res.writableEnded && req.socket && !req.socket.destroyed) {
        res.write(':keep-alive\n\n');
      } else {
        clearInterval(heartbeatTimer);
        liveEmitter.off(channel, handleLiveEvent);
      }
    } catch {
      clearInterval(heartbeatTimer);
      liveEmitter.off(channel, handleLiveEvent);
    }
  }, 20000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeatTimer);
    liveEmitter.off(channel, handleLiveEvent);
  });
});

module.exports = router;
