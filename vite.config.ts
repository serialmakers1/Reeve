import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from '@sentry/vite-plugin';

const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    sourcemap: hasSentryAuthToken,
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'serial-makers',
      project: 'reeve',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: hasSentryAuthToken ? {
        filesToDeleteAfterUpload: ['./dist/**/*.js.map'],
      } : undefined,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
