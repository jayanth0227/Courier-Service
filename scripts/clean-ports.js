const { execSync } = require('child_process');

const specifiedPorts = process.argv.slice(2).map(Number).filter(Boolean);
const PORTS = specifiedPorts.length > 0 ? specifiedPorts : [5000, 5173];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function getListeningPidsWindows(port) {
  try {
    const stdout = execSync('netstat -ano', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = stdout.split(/\r?\n/);
    const pids = new Set();
    const portPattern = new RegExp(`[:\\]]${port}$`);

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;
      
      const proto = parts[0].toUpperCase();
      if (proto !== 'TCP' && proto !== 'UDP') continue;

      const localAddr = parts[1];
      if (portPattern.test(localAddr)) {
        // Must be in LISTENING state (or UDP)
        const isListening = parts.includes('LISTENING') || proto === 'UDP';
        if (!isListening) continue;

        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== `${process.pid}` && pid !== `${process.ppid}`) {
          pids.add(pid);
        }
      }
    }
    return Array.from(pids);
  } catch {
    return [];
  }
}

function killPortWindows(port) {
  const pids = getListeningPidsWindows(port);
  if (pids.length === 0) return;

  for (const pid of pids) {
    try {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      console.log(`[clean-ports] Freed port ${port} (terminated process tree for PID ${pid})`);
    } catch {
      // Process may have already exited
    }
  }

  // Brief polling to ensure the OS network stack has fully released the socket
  for (let attempt = 0; attempt < 10; attempt++) {
    const remaining = getListeningPidsWindows(port);
    if (remaining.length === 0) break;
    sleep(100);
  }
}

function killPortUnix(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    for (const pid of pids) {
      if (pid && pid !== `${process.pid}` && pid !== `${process.ppid}`) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          console.log(`[clean-ports] Freed port ${port} (terminated PID ${pid})`);
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // Port not in use
  }
}

for (const port of PORTS) {
  if (process.platform === 'win32') {
    killPortWindows(port);
  } else {
    killPortUnix(port);
  }
}

