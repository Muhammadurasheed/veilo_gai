import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Conditionally import lovable-tagger only in Lovable environment
function getComponentTagger() {
  try {
    // This will only work in Lovable environment
    const { componentTagger } = require("lovable-tagger");
    return componentTagger;
  } catch {
    // Silently fail in local development
    return null;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const componentTagger = getComponentTagger();
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: process.env.VITE_API_BASE_URL || "https://veilos-backend.onrender.com",
          changeOrigin: true,
          secure: true,
        },
      },
    },
    plugins: [
      react(),
      // Only use componentTagger if available (Lovable environment)
      mode === 'development' && componentTagger && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
