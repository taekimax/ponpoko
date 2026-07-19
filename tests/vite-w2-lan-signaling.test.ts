import { PassThrough } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import {
  W2LanSignalingStore,
  W2_LAN_SIGNALING_MAX_BODY_BYTES,
  W2_LAN_SIGNALING_READY_LEASE_MS,
  createW2LanSignalingMiddleware
} from "../vite-w2-lan-signaling";

const offer = { type: "offer" as const, sdp: "offer-sdp" };
const answer = { type: "answer" as const, sdp: "answer-sdp" };

describe("W2 LAN signaling store", () => {
  it("rejects a delayed competing CAS-zero offer and preserves the winner", () => {
    const store = new W2LanSignalingStore();
    const first = store.offer("room-1", 0, offer);
    expect(store.answer("room-1", first.revision, answer).answer).toEqual(answer);
    expect(store.ready("room-1", first.revision, true).guestReady).toBe(true);

    expect(() => store.offer("room-1", 0, { ...offer, sdp: "delayed-offer" })).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(store.get("room-1")).toEqual({
      revision: first.revision,
      offer,
      answer,
      guestReady: true
    });
  });

  it("lets a caller replace an old offer after observing its current revision", () => {
    const store = new W2LanSignalingStore();
    const first = store.offer("room-1", 0, offer);
    store.answer("room-1", first.revision, answer);
    store.ready("room-1", first.revision, true);

    const replaced = store.offer("room-1", first.revision, {
      ...offer,
      sdp: "new-offer"
    });
    expect(replaced.revision).toBeGreaterThan(first.revision);
    expect(replaced).toEqual({
      revision: expect.any(Number),
      offer: { type: "offer", sdp: "new-offer" },
      answer: null,
      guestReady: false
    });
    expect(() => store.answer("room-1", first.revision, answer)).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  it("does not reuse revisions across stores in the running process", () => {
    const first = new W2LanSignalingStore().offer("room-1", 0, offer);
    const second = new W2LanSignalingStore().offer("room-1", 0, offer);

    expect(second.revision).toBeGreaterThan(first.revision);
  });

  it("makes delayed delete conditional on the current revision", () => {
    const store = new W2LanSignalingStore();
    const first = store.offer("room-1", 0, offer);
    const replacement = store.offer("room-1", first.revision, {
      ...offer,
      sdp: "replacement"
    });

    expect(() => store.delete("room-1", first.revision)).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(store.get("room-1")).toMatchObject({
      revision: replacement.revision,
      offer: { type: "offer", sdp: "replacement" }
    });
    expect(store.delete("room-1", replacement.revision)).toBe(true);
    expect(store.delete("room-1", replacement.revision)).toBe(false);
  });

  it("accepts one guest answer and only marks an answered room ready", () => {
    const store = new W2LanSignalingStore();
    const revision = store.offer("room-1", 0, offer).revision;

    expect(() => store.ready("room-1", revision, true)).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    store.answer("room-1", revision, answer);
    expect(() => store.answer("room-1", revision, answer)).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(store.ready("room-1", revision, true).guestReady).toBe(true);
  });

  it("leases guest readiness and clears it immediately on ready false", () => {
    let now = 100;
    const store = new W2LanSignalingStore(
      () => now,
      W2_LAN_SIGNALING_READY_LEASE_MS * 10,
      8,
      W2_LAN_SIGNALING_READY_LEASE_MS
    );
    const revision = store.offer("room-1", 0, offer).revision;
    store.answer("room-1", revision, answer);
    store.ready("room-1", revision, true);

    now += W2_LAN_SIGNALING_READY_LEASE_MS - 1;
    expect(store.get("room-1").guestReady).toBe(true);
    now += 1;
    expect(store.get("room-1").guestReady).toBe(false);

    expect(store.ready("room-1", revision, true).guestReady).toBe(true);
    expect(store.ready("room-1", revision, false).guestReady).toBe(false);
    expect(store.get("room-1").guestReady).toBe(false);
  });

  it("never reuses revisions after expiry or delete and rejects old messages", () => {
    let now = 100;
    const store = new W2LanSignalingStore(() => now, 10);
    const expired = store.offer("room-1", 0, offer);

    now = 110;
    expect(store.get("room-1").revision).toBe(0);
    expect(() =>
      store.offer("room-1", expired.revision, { ...offer, sdp: "stale-after-expiry" })
    ).toThrowError(expect.objectContaining({ statusCode: 409 }));
    const afterExpiry = store.offer("room-1", 0, { ...offer, sdp: "after-expiry" });
    expect(afterExpiry.revision).toBeGreaterThan(expired.revision);
    expect(() => store.answer("room-1", expired.revision, answer)).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(() => store.ready("room-1", expired.revision, true)).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );

    expect(store.delete("room-1", afterExpiry.revision)).toBe(true);
    expect(() =>
      store.offer("room-1", afterExpiry.revision, { ...offer, sdp: "stale-after-delete" })
    ).toThrowError(expect.objectContaining({ statusCode: 409 }));
    const afterDelete = store.offer("room-1", 0, { ...offer, sdp: "after-delete" });
    expect(afterDelete.revision).toBeGreaterThan(afterExpiry.revision);
    expect(() => store.answer("room-1", afterExpiry.revision, answer)).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(() => store.ready("room-1", afterExpiry.revision, false)).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  it("isolates rooms while using process-unique revisions", () => {
    const store = new W2LanSignalingStore();
    const one = store.offer("one", 0, offer);
    const two = store.offer("two", 0, { ...offer, sdp: "offer-two" });

    expect(two.revision).toBeGreaterThan(one.revision);
    store.answer("two", two.revision, { ...answer, sdp: "answer-two" });
    store.ready("two", two.revision, true);
    expect(() => store.offer("two", 0, { ...offer, sdp: "stale-two" })).toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    const replacement = store.offer("one", one.revision, {
      ...offer,
      sdp: "replacement-one"
    });
    expect(store.delete("one", replacement.revision)).toBe(true);
    expect(store.get("one").revision).toBe(0);
    expect(store.get("two")).toMatchObject({
      revision: two.revision,
      answer: { type: "answer", sdp: "answer-two" },
      guestReady: true
    });
  });

  it("expires rooms, enforces the room cap, and deletes explicitly", () => {
    let now = 100;
    const store = new W2LanSignalingStore(() => now, 10, 2);
    const one = store.offer("one", 0, offer);
    const two = store.offer("two", 0, offer);
    expect(() => store.offer("three", 0, offer)).toThrowError(
      expect.objectContaining({ statusCode: 429 })
    );
    expect(store.delete("one", one.revision)).toBe(true);
    expect(store.get("one").revision).toBe(0);
    const three = store.offer("three", 0, offer);
    expect(three.revision).toBeGreaterThan(two.revision);

    now = 110;
    expect(store.get("two").revision).toBe(0);
    expect(store.offer("four", 0, offer).revision).toBeGreaterThan(three.revision);
  });
});

describe("W2 LAN signaling middleware", () => {
  it("passes unrelated routes through", async () => {
    const result = await request("GET", "/ponpoko/other");
    expect(result.nextCalled).toBe(true);
    expect(result.ended).toBe(false);
  });

  it("returns no-store empty state and supports offer, answer, ready, and delete", async () => {
    const store = new W2LanSignalingStore();
    const empty = await request("GET", "/ponpoko/__w2_lan?room=room-1", undefined, store);
    expect(empty.statusCode).toBe(200);
    expect(empty.headers["Cache-Control"]).toBe("no-store");
    expect(empty.json).toEqual({ revision: 0, offer: null, answer: null, guestReady: false });

    const posted = await request(
      "POST",
      "/ponpoko/__w2_lan",
      { action: "offer", room: "room-1", expectedRevision: 0, description: offer },
      store
    );
    expect(posted.json).toEqual({
      revision: expect.any(Number),
      offer,
      answer: null,
      guestReady: false
    });
    const revision = posted.json.revision;
    expect(
      (
        await request(
          "POST",
          "/ponpoko/__w2_lan",
          { action: "answer", room: "room-1", revision, description: answer },
          store
        )
      ).statusCode
    ).toBe(200);
    expect(
      (
        await request(
          "POST",
          "/ponpoko/__w2_lan",
          { action: "ready", room: "room-1", revision, ready: true },
          store
        )
      ).json.guestReady
    ).toBe(true);
    expect(
      (
        await request(
          "DELETE",
          `/ponpoko/__w2_lan?room=room-1&revision=${revision}`,
          undefined,
          store
        )
      ).json
    ).toEqual({ deleted: true });
  });

  it("applies offer compare-and-set before replacing room state", async () => {
    const store = new W2LanSignalingStore();
    const first = await request(
      "POST",
      "/ponpoko/__w2_lan",
      { action: "offer", room: "room-1", expectedRevision: 0, description: offer },
      store
    );
    const firstRevision = first.json.revision;

    const delayed = await request(
      "POST",
      "/ponpoko/__w2_lan",
      {
        action: "offer",
        room: "room-1",
        expectedRevision: 0,
        description: { ...offer, sdp: "delayed" }
      },
      store
    );
    expect(delayed.statusCode).toBe(409);
    expect(store.get("room-1")).toMatchObject({ revision: firstRevision, offer });

    const replacement = await request(
      "POST",
      "/ponpoko/__w2_lan",
      {
        action: "offer",
        room: "room-1",
        expectedRevision: firstRevision,
        description: { ...offer, sdp: "replacement" }
      },
      store
    );
    expect(replacement.statusCode).toBe(200);
    expect(replacement.json).toMatchObject({
      revision: expect.any(Number),
      offer: { type: "offer", sdp: "replacement" },
      answer: null,
      guestReady: false
    });
  });

  it("requires DELETE revision and rejects delayed teardown without deleting a replacement", async () => {
    const store = new W2LanSignalingStore();
    const first = store.offer("room-1", 0, offer);
    const replacement = store.offer("room-1", first.revision, {
      ...offer,
      sdp: "replacement"
    });

    expect(
      (await request("DELETE", "/ponpoko/__w2_lan?room=room-1", undefined, store)).statusCode
    ).toBe(400);
    expect(
      (
        await request(
          "DELETE",
          `/ponpoko/__w2_lan?room=room-1&revision=${first.revision}`,
          undefined,
          store
        )
      ).statusCode
    ).toBe(409);
    expect(store.get("room-1").revision).toBe(replacement.revision);
  });

  it("validates methods, rooms, content type, JSON, and bounded bodies", async () => {
    expect((await request("GET", "/ponpoko/__w2_lan?room=UPPER")).statusCode).toBe(400);
    expect((await request("PATCH", "/ponpoko/__w2_lan?room=room")).statusCode).toBe(405);
    expect(
      (await request("POST", "/ponpoko/__w2_lan", "{}", undefined, "text/plain")).statusCode
    ).toBe(415);
    expect(
      (await request("POST", "/ponpoko/__w2_lan", "{}", undefined, "application/jsonx"))
        .statusCode
    ).toBe(415);
    expect(
      (
        await request(
          "POST",
          "/ponpoko/__w2_lan",
          {
            action: "offer",
            room: "json-room",
            expectedRevision: 0,
            description: offer
          },
          undefined,
          " \tApPlIcAtIoN/JsOn \t; charset=utf-8"
        )
      ).statusCode
    ).toBe(200);
    expect(
      (
        await request("POST", "/ponpoko/__w2_lan", {
          action: "offer",
          room: "room",
          description: offer
        })
      ).statusCode
    ).toBe(400);
    for (const expectedRevision of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, "0"]) {
      expect(
        (
          await request("POST", "/ponpoko/__w2_lan", {
            action: "offer",
            room: "room",
            expectedRevision,
            description: offer
          })
        ).statusCode
      ).toBe(400);
    }
    expect(
      (await request("POST", "/ponpoko/__w2_lan", "not-json", undefined, "application/json"))
        .statusCode
    ).toBe(400);
    expect(
      (
        await request(
          "POST",
          "/ponpoko/__w2_lan",
          "x".repeat(W2_LAN_SIGNALING_MAX_BODY_BYTES + 1),
          undefined,
          "application/json"
        )
      ).statusCode
    ).toBe(413);
  });
});

async function request(
  method: string,
  url: string,
  body?: unknown,
  store = new W2LanSignalingStore(),
  contentType = "application/json"
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  json: Record<string, any>;
  ended: boolean;
  nextCalled: boolean;
}> {
  const stream = new PassThrough();
  const payload =
    body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  Object.assign(stream, {
    method,
    url,
    headers: payload ? { "content-type": contentType } : {}
  });

  const headers: Record<string, string> = {};
  let responseBody = "";
  let resolveEnded!: () => void;
  const ended = new Promise<void>((resolve) => {
    resolveEnded = resolve;
  });
  let writableEnded = false;
  const response = {
    statusCode: 200,
    get writableEnded() {
      return writableEnded;
    },
    setHeader(name: string, value: number | string | readonly string[]) {
      headers[name] = Array.isArray(value) ? value.join(", ") : String(value);
      return response;
    },
    end(chunk?: string) {
      if (chunk) responseBody += chunk;
      writableEnded = true;
      resolveEnded();
      return response;
    }
  } as unknown as ServerResponse;
  let nextCalled = false;
  createW2LanSignalingMiddleware(store)(
    stream as unknown as IncomingMessage,
    response,
    () => {
      nextCalled = true;
      resolveEnded();
    }
  );
  stream.end(payload);
  await ended;

  return {
    statusCode: response.statusCode,
    headers,
    json: responseBody ? (JSON.parse(responseBody) as Record<string, any>) : {},
    ended: response.writableEnded,
    nextCalled
  };
}
