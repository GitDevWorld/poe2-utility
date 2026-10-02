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
      "/api/trade": {
        target: "https://www.pathofexile.com",
        changeOrigin: true,
        rewrite: (path, req) => {
          const raw = req.originalUrl ?? req.url ?? path;
          const parsed = new URL(raw, "http://localhost");
          const rel = parsed.searchParams.get("path");
          if (!rel) return path;
          parsed.searchParams.delete("path");
          const qs = parsed.searchParams.toString();
          return `/api/trade2/${rel}${qs ? `?${qs}` : ""}`;
        },
        headers: {
          "User-Agent": "OAuth poe2-utility/0.1 (+https://github.com/GitDevWorld/poe2-utility)",
        },
      },
    },
  },
});
