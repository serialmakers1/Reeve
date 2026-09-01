import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from '@sentry/vite-plugin';

const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);
// Emergency Vercel switch: set SENTRY_SKIP_BUILD=1 to fully bypass the Sentry plugin during a Sentry
// outage (esp. when uploads HANG — errorHandler only runs after an error, it can't interrupt a hang).
// Reset to 0 / remove once Sentry recovers; do not leave on permanently.
const skipSentryBuild = process.env.SENTRY_SKIP_BUILD === '1';
const sentryBuildEnabled = hasSentryAuthToken && !skipSentryBuild;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // 'hidden' → emit maps for Sentry upload but omit the sourceMappingURL comment; deleted post-upload.
    sourcemap: sentryBuildEnabled ? 'hidden' : false,
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'serial-makers',
      project: 'reeve',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Fully disables the plugin (no Sentry network call) when there is no token or the kill-switch is set.
      disable: !sentryBuildEnabled,
      // A Sentry release/upload FAILURE (e.g. 5xx) becomes a warning instead of failing the whole build.
      errorHandler: (err) => {
        console.warn('[sentry-vite-plugin] Upload/release failed; continuing build:', err);
      },
      sourcemaps: sentryBuildEnabled ? {
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
