import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // If request has token in query string (from SSE EventSource),
            // move to Authorization header and clean up the URL path to protect secrets
            if (req.url && req.url.includes('token=')) {
              try {
                const parsedUrl = new URL(req.url, 'http://127.0.0.1:5000');
                const queryToken = parsedUrl.searchParams.get('token');
                if (queryToken && !proxyReq.getHeader('authorization')) {
                  proxyReq.setHeader('authorization', `Bearer ${queryToken}`);
                }
                parsedUrl.searchParams.delete('token');
                const cleanPath = parsedUrl.pathname + (parsedUrl.search || '');
                proxyReq.path = cleanPath;
                req.url = cleanPath;
              } catch {}
            }
          });

          proxy.on('error', (err, req, res) => {
            if (req && req.url) {
              req.url = req.url.replace(/([?&](?:token|jwt|apiKey|key|password|secret)=)[^&]*/gi, '$1[REDACTED]');
            }
            // Gracefully handle expected disconnects / socket resets on SSE streams or backend restarts
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'EPIPE') {
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend server restarting or unavailable' }));
              }
              return;
            }
            console.error('[vite proxy error]', err.message);
          });
        },
      },
    },
  },
})
