import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function consoleForwarder() {
  return {
    name: 'console-forwarder',
    configureServer(server: any) {
      server.middlewares.use('/__console', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const level = String(data.level || 'log');
            const args = Array.isArray(data.args) ? data.args : [];
            const message = args.map((x: any) => String(x)).join(' ');
            const prefix = '[web]';

            if (level === 'error') console.error(prefix, message);
            else if (level === 'warn') console.warn(prefix, message);
            else if (level === 'info') console.info(prefix, message);
            else if (level === 'debug') console.debug(prefix, message);
            else console.log(prefix, message);
          } catch (e) {
            console.warn('[web] (bad console payload)', e);
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), consoleForwarder()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.d.ts', 'src/main.tsx', 'src/index.tsx']
    }
  }
})