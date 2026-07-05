import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Eigenständige Vitest-Config, damit die Lovable-Vite-Plugins (Nitro/TanStack
// Start-Server) die reinen Unit-Tests nicht beeinflussen. Der @/-Alias wird
// über vite-tsconfig-paths aus der tsconfig.json übernommen.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
  },
});
