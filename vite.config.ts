import { defineConfig } from "vitest/config";
import { createExternalRomMiddleware } from "./vite-roms";

const externalRomPlugin = {
  name: "external-roms",
  configureServer(server: { middlewares: { use: (middleware: ReturnType<typeof createExternalRomMiddleware>) => void } }) {
    server.middlewares.use(createExternalRomMiddleware());
  },
  configurePreviewServer(server: { middlewares: { use: (middleware: ReturnType<typeof createExternalRomMiddleware>) => void } }) {
    server.middlewares.use(createExternalRomMiddleware());
  }
};

export default defineConfig({
  base: "/ponpoko/",
  plugins: [externalRomPlugin],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["jessie.adal-alhena.ts.net"]
  },
  preview: {
    host: "0.0.0.0"
  },
  test: {
    environment: "node"
  }
});
