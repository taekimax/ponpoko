import { describe, expect, it, vi } from "vitest";
import { downloadRom } from "../src/rom-download";

describe("ROM downloader", () => {
  it("downloads a ROM at play time and reports progress", async () => {
    const progress: number[] = [];
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });
    const fetcher = vi.fn(async () => new Response(stream, {
      headers: { "content-length": "4" }
    }));

    const result = await downloadRom("/ponpoko/roms/ponpoko.zip", {
      fetcher,
      onProgress: (value) => progress.push(value)
    });

    expect(fetcher).toHaveBeenCalledWith("/ponpoko/roms/ponpoko.zip");
    expect(result.blob.size).toBe(4);
    expect(result.objectUrl).not.toBeNull();
    expect(result.objectUrl?.startsWith("blob:")).toBe(true);
    expect(progress).toEqual([50, 100]);

    URL.revokeObjectURL(result.objectUrl!);
  });

  it("returns a Korean error message when download fails", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));

    await expect(downloadRom("/ponpoko/roms/missing.zip", { fetcher })).rejects.toThrow(
      "ROM을 다운로드하지 못했습니다"
    );
  });

  it("can warm up a ROM download without creating a blob URL", async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([0x50, 0x4b]), {
      headers: { "content-length": "2" }
    }));

    const result = await downloadRom("/ponpoko/roms/ponpoko.zip", {
      fetcher,
      createObjectUrl: false
    });

    expect(result.blob.size).toBe(2);
    expect(result.objectUrl).toBeNull();
  });
});
