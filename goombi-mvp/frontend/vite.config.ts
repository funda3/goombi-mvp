import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const GH_PAGES_BASE = "/goombi-mvp/";

export default defineConfig({
  base: GH_PAGES_BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "Goombi",
        short_name: "Goombi",
        description: "Find accommodation and workspaces across South Africa",
        theme_color: "#1a7a4a",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: GH_PAGES_BASE,
        icons: [
          { src: `${GH_PAGES_BASE}icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${GH_PAGES_BASE}icon-512.png`, sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    open: false,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
