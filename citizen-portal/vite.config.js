import { defineConfig } from "vite";

// This project previously had no vite config, so it fell back to Vite's
// default port picking and could silently bind 5173 - the same port the
// command center uses. Pin it to 5174 and fail loudly on a clash.
export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
  },
});