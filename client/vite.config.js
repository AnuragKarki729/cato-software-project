import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Every request to /api is forwarded to the FastAPI server.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.VITE_API_TARGET || "http://localhost:8000",
    },
  },
});
