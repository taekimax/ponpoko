import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/ponpoko/",
  server: {
    host: "0.0.0.0"
  },
  preview: {
    host: "0.0.0.0"
  },
  test: {
    environment: "node"
  }
});
