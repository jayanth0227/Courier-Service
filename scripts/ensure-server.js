const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function checkPort(port, host = '127.0.0.1', timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function ensureBackendServer() {
  const isRunning = await checkPort(5000);
  if (isRunning) {
    console.log('[backend] ✓ API server is active on http://127.0.0.1:5000');
    return;
  }

  console.log('[backend] API server not running on port 5000. Auto-starting backend...');
  const rootDir = path.join(__dirname, '..');
  const serverScript = path.join(rootDir, 'server', 'server.js');
  const logFile = path.join(rootDir, '.backend.log');

  const logFd = fs.openSync(logFile, 'a');

  const child = spawn(process.execPath, [serverScript], {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();

  // Wait up to 6 seconds for backend to start listening on port 5000
  let ready = false;
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await checkPort(5000);
    if (ready) break;
  }

  if (ready) {
    console.log('[backend] ✓ Backend API server successfully started on http://127.0.0.1:5000');
  } else {
    console.warn('[backend] Note: Backend server launched in background; connecting to MongoDB Atlas.');
  }
}

ensureBackendServer().catch((err) => {
  console.error('[backend] Error starting server:', err.message);
});
