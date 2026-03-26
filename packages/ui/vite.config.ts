import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  if (command === "build" && !process.env.VITE_GOOGLE_PLACES_API_KEY) {
    throw new Error("VITE_GOOGLE_PLACES_API_KEY is required for production builds");
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      global: "globalThis",
    },
  };
});
