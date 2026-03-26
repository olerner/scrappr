import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  if (command === "build") {
    const required = ["VITE_USER_POOL_ID", "VITE_USER_POOL_CLIENT_ID", "VITE_GOOGLE_PLACES_API_KEY"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(`Missing required env vars for production build: ${missing.join(", ")}`);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      global: "globalThis",
    },
  };
});
