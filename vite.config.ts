import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/ninja": {
        target: "https://poe.ninja",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ninja/, ""),
        headers: {
          "User-Agent": "poe2-utility-local/0.1 (local-dev)",
        },
      },
    },
  },
});
