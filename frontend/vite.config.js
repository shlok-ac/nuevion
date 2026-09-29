
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  server: {
    // Pinned so this app is always reachable at the same port.
    // strictPort makes Vite fail loudly on a clash instead of silently
    // incrementing to 5174+, which previously made it look like the
    // command center was "blank" when the citizen portal held 5173.
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});