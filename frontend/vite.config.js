import {defineConfig} from 'vite';

// Use the backend's IPv6 listener directly so localhost cannot resolve to a
// different service bound to the same port on IPv4.
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: { protocol: 'http:', host: '[::1]:4000', hostname: '::1', port: 4000 },
        // The backend checks Origin against the browser-facing Host.
        changeOrigin: false,
      },
    },
  },
});
