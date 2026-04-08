import { defineConfig } from 'vite';

/** @see README — run `vercel dev` on port 3000 for local `/api`, or rely on preview/prod deploy */
export default defineConfig({
  /** Braze Web SDK: pre-bundling can reorder declarations so subclass appears before base (e.g. HtmlMessage before InAppMessage). */
  optimizeDeps: {
    exclude: ['@braze/web-sdk'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
});
