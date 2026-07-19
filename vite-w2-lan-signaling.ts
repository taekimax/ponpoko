import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";

/** Exact development-only HTTP route used by the W2 LAN harness. */
export const W2_LAN_SIGNALING_ROUTE = "/ponpoko/__w2_lan";
/** Inactivity lifetime for an in-memory signaling room. */
export const W2_LAN_SIGNALING_TTL_MS = 5 * 60 * 1000;
/** Maximum number of concurrently active in-memory rooms. */
export const W2_LAN_SIGNALING_MAX_ROOMS = 8;
/** Maximum accepted HTTP request body and SDP size in UTF-8 bytes. */
export const W2_LAN_SIGNALING_MAX_BODY_BYTES = 64 * 1024;
/** Time a matching-revision `ready: true` heartbeat remains observable. */
export const W2_LAN_SIGNALING_READY_LEASE_MS = 2 * 1000;

/** Minimal session description exchanged by the temporary W2 LAN harness. */
export interface W2LanDescription {
  type: "offer" | "answer";
  sdp: string;
}

/**
 * Public room state. `revision` is an opaque generation token used as an
 * offer's `expectedRevision` and echoed by answer, ready, and DELETE requests.
 * Positive revisions are never reused by the running server process; an absent
 * room is represented by revision `0`.
 */
export interface W2LanRoomSnapshot {
  revision: number;
  offer: W2LanDescription | null;
  answer: W2LanDescription | null;
  guestReady: boolean;
}

interface W2LanRoomState {
  revision: number;
  offer: W2LanDescription;
  answer: W2LanDescription | null;
  guestReadyAt: number | null;
  updatedAt: number;
}

let nextW2LanSignalingRevision = 1;

export class W2LanSignalingError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export class W2LanSignalingStore {
  private readonly rooms = new Map<string, W2LanRoomState>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly ttlMs = W2_LAN_SIGNALING_TTL_MS,
    private readonly maxRooms = W2_LAN_SIGNALING_MAX_ROOMS,
    private readonly readyLeaseMs = W2_LAN_SIGNALING_READY_LEASE_MS
  ) {}

  get(room: string): W2LanRoomSnapshot {
    const now = this.now();
    this.cleanup(now);
    const state = this.rooms.get(room);
    return state ? this.snapshot(state, now) : emptySnapshot();
  }

  offer(
    room: string,
    expectedRevision: number,
    description: W2LanDescription
  ): W2LanRoomSnapshot {
    const now = this.now();
    this.cleanup(now);
    const existing = this.rooms.get(room);
    if ((existing?.revision ?? 0) !== expectedRevision) {
      throw new W2LanSignalingError(409, "Offer revision conflict");
    }
    if (!existing && this.rooms.size >= this.maxRooms) {
      throw new W2LanSignalingError(429, "Room limit reached");
    }

    const state: W2LanRoomState = {
      revision: this.allocateRevision(),
      offer: cloneDescription(description),
      answer: null,
      guestReadyAt: null,
      updatedAt: now
    };
    this.rooms.set(room, state);
    return this.snapshot(state, now);
  }

  answer(room: string, revision: number, description: W2LanDescription): W2LanRoomSnapshot {
    const now = this.now();
    const state = this.requireCurrent(room, revision, now);
    if (state.answer) {
      throw new W2LanSignalingError(409, "Room already has an answer");
    }
    state.answer = cloneDescription(description);
    state.guestReadyAt = null;
    state.updatedAt = now;
    return this.snapshot(state, now);
  }

  ready(room: string, revision: number, ready: boolean): W2LanRoomSnapshot {
    const now = this.now();
    const state = this.requireCurrent(room, revision, now);
    if (!state.answer) {
      throw new W2LanSignalingError(409, "Room has no answer");
    }
    state.guestReadyAt = ready ? now : null;
    state.updatedAt = now;
    return this.snapshot(state, now);
  }

  delete(room: string, revision: number): boolean {
    const now = this.now();
    this.cleanup(now);
    const state = this.rooms.get(room);
    if (!state) {
      return false;
    }
    if (state.revision !== revision) {
      throw new W2LanSignalingError(409, "Stale room revision");
    }
    return this.rooms.delete(room);
  }

  private requireCurrent(room: string, revision: number, now: number): W2LanRoomState {
    this.cleanup(now);
    const state = this.rooms.get(room);
    if (!state) {
      throw new W2LanSignalingError(404, "Room not found");
    }
    if (state.revision !== revision) {
      throw new W2LanSignalingError(409, "Stale room revision");
    }
    return state;
  }

  private cleanup(now: number): void {
    const cutoff = now - this.ttlMs;
    for (const [room, state] of this.rooms) {
      if (state.updatedAt <= cutoff) {
        this.rooms.delete(room);
      }
    }
  }

  private allocateRevision(): number {
    if (!Number.isSafeInteger(nextW2LanSignalingRevision)) {
      throw new W2LanSignalingError(503, "Room revision limit reached");
    }
    return nextW2LanSignalingRevision++;
  }

  private snapshot(state: W2LanRoomState, now: number): W2LanRoomSnapshot {
    return {
      revision: state.revision,
      offer: cloneDescription(state.offer),
      answer: state.answer ? cloneDescription(state.answer) : null,
      guestReady:
        state.guestReadyAt !== null && now - state.guestReadyAt < this.readyLeaseMs
    };
  }
}

export function createW2LanSignalingMiddleware(
  store = new W2LanSignalingStore()
): Connect.NextHandleFunction {
  return (request, response, next) => {
    const url = new URL(request.url ?? "", "http://localhost");
    if (url.pathname !== W2_LAN_SIGNALING_ROUTE) {
      next();
      return;
    }

    applyResponseHeaders(response);
    void handleRequest(request, response, store, url).catch((error: unknown) => {
      const signalingError =
        error instanceof W2LanSignalingError
          ? error
          : new W2LanSignalingError(500, "Signaling request failed");
      sendJson(response, signalingError.statusCode, { error: signalingError.message });
    });
  };
}

export function createW2LanSignalingPlugin(): Plugin {
  const store = new W2LanSignalingStore();
  return {
    name: "w2-lan-signaling",
    configureServer(server) {
      server.middlewares.use(createW2LanSignalingMiddleware(store));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createW2LanSignalingMiddleware(store));
    }
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  store: W2LanSignalingStore,
  url: URL
): Promise<void> {
  const method = request.method ?? "GET";
  if (method === "GET") {
    const room = requireRoom(url.searchParams.get("room"));
    sendJson(response, 200, store.get(room));
    return;
  }
  if (method === "DELETE") {
    const room = requireRoom(url.searchParams.get("room"));
    const revision = requireRevisionParameter(url.searchParams.get("revision"));
    sendJson(response, 200, { deleted: store.delete(room, revision) });
    return;
  }
  if (method === "POST") {
    requireJsonContentType(request.headers["content-type"]);
    const body = await readJsonBody(request);
    sendJson(response, 200, applyAction(store, body));
    return;
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  throw new W2LanSignalingError(405, "Method not allowed");
}

function applyAction(store: W2LanSignalingStore, body: unknown): W2LanRoomSnapshot {
  if (!isRecord(body) || typeof body.action !== "string") {
    throw new W2LanSignalingError(400, "Invalid action");
  }
  const room = requireRoom(body.room);
  if (body.action === "offer") {
    return store.offer(
      room,
      requireExpectedRevision(body.expectedRevision),
      requireDescription(body.description, "offer")
    );
  }
  if (body.action === "answer") {
    return store.answer(
      room,
      requireRevision(body.revision),
      requireDescription(body.description, "answer")
    );
  }
  if (body.action === "ready") {
    if (typeof body.ready !== "boolean") {
      throw new W2LanSignalingError(400, "Invalid ready state");
    }
    return store.ready(room, requireRevision(body.revision), body.ready);
  }
  throw new W2LanSignalingError(400, "Invalid action");
}

function requireRoom(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9-]{1,24}$/.test(value)) {
    throw new W2LanSignalingError(400, "Invalid room");
  }
  return value;
}

function requireRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new W2LanSignalingError(400, "Invalid revision");
  }
  return value as number;
}

function requireExpectedRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new W2LanSignalingError(400, "Invalid expected revision");
  }
  return value as number;
}

function requireRevisionParameter(value: string | null): number {
  if (value === null || !/^[1-9][0-9]*$/.test(value)) {
    throw new W2LanSignalingError(400, "Invalid revision");
  }
  return requireRevision(Number(value));
}

function requireDescription(value: unknown, type: W2LanDescription["type"]): W2LanDescription {
  if (
    !isRecord(value) ||
    value.type !== type ||
    typeof value.sdp !== "string" ||
    value.sdp.length < 1 ||
    Buffer.byteLength(value.sdp, "utf8") > W2_LAN_SIGNALING_MAX_BODY_BYTES
  ) {
    throw new W2LanSignalingError(400, "Invalid session description");
  }
  return { type, sdp: value.sdp };
}

function requireJsonContentType(value: string | string[] | undefined): void {
  const contentType = Array.isArray(value) ? value[0] : value;
  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new W2LanSignalingError(415, "JSON content type required");
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > W2_LAN_SIGNALING_MAX_BODY_BYTES) {
    throw new W2LanSignalingError(413, "Request body too large");
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > W2_LAN_SIGNALING_MAX_BODY_BYTES) {
      throw new W2LanSignalingError(413, "Request body too large");
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new W2LanSignalingError(400, "Invalid JSON");
  }
}

function applyResponseHeaders(response: ServerResponse): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  if (response.writableEnded) {
    return;
  }
  response.statusCode = statusCode;
  response.end(JSON.stringify(body));
}

function emptySnapshot(): W2LanRoomSnapshot {
  return { revision: 0, offer: null, answer: null, guestReady: false };
}

function cloneDescription(description: W2LanDescription): W2LanDescription {
  return { type: description.type, sdp: description.sdp };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
