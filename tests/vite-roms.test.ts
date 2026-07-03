import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXTERNAL_ROM_DIR, applyExternalRomHeaders, resolveExternalRomPath } from "../vite-roms";

describe("external ROM server paths", () => {
  it("defaults to the shared local ROM workspace", () => {
    expect(EXTERNAL_ROM_DIR).toBe("/Volumes/dev/ponpoko/roms");
  });

  it("resolves same-origin ROM URLs to the external ROM directory", () => {
    expect(resolveExternalRomPath("/ponpoko/roms/ponpoko.zip")).toBe(
      path.join(EXTERNAL_ROM_DIR, "ponpoko.zip")
    );
    expect(resolveExternalRomPath("/ponpoko/roms/spangj.zip?cache=1", "/tmp/roms")).toBe(
      path.join("/tmp/roms", "spangj.zip")
    );
  });

  it("rejects non-ROM routes and traversal attempts", () => {
    expect(resolveExternalRomPath("/ponpoko/thumbs/ponpoko.jpg")).toBeNull();
    expect(resolveExternalRomPath("/ponpoko/roms/../secret.zip")).toBeNull();
    expect(resolveExternalRomPath("/ponpoko/roms/%2e%2e%2Fsecret.zip")).toBeNull();
    expect(resolveExternalRomPath("/ponpoko/roms/not-a-rom.txt")).toBeNull();
  });

  it("adds cross-origin headers so GitHub Pages can fetch authorized remote ROMs", () => {
    const headers: Record<string, string> = {};
    const response = {
      setHeader(name: string, value: string) {
        headers[name] = value;
        return response;
      }
    };

    applyExternalRomHeaders(response);

    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["Access-Control-Allow-Methods"]).toBe("GET, HEAD, OPTIONS");
    expect(headers["Access-Control-Allow-Headers"]).toBe("Range");
  });
});
