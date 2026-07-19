# W1 Player-Aware Input Implementation

- Prepared: 2026-07-18 13:12 KST
- Role: Generator
- Status: W1 `done`
- Source requirements: P6 and the W1 portion of P10
- Mutation boundary: local input contract, runtime adapters, and focused tests only; no dependency, WebRTC, signaling, TURN, QR, infrastructure, `main`, or Pages change

## Implemented boundary

- Added the explicit `EmulatorPlayer = 0 | 1` contract and changed active input snapshots from input-only values to `{ player, input }` pairs.
- Added a shared player-aware input adapter that de-duplicates each `(player,input)` pair independently, releases one player without altering the other, and can release all state during runtime lifecycle cleanup.
- Kept every existing keyboard, touch, and local controller path explicitly on player `0`.
- Forwarded the selected player to EmulatorJS `simulateInput(player, inputId, state)`; no payload-controlled or network-controlled player selection exists in W1.
- Updated the fake, direct, runtime-selecting, and EmulatorJS adapters to the same contract.

## Focused safety evidence

- The fake contract test holds the same `left` input for P1 and P2, releases all P2 state, proves P1 remains active, and then releases P1 separately.
- The EmulatorJS boundary test performs the same scoped release against recorded `simulateInput` calls, including multiple P2 inputs and a duplicate held P1 press.
- Input-router tests prove all existing local input and sustain/release paths still issue player `0` calls.

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm test -- tests/native-emulator.test.ts tests/input-router.test.ts tests/emulator.test.ts tests/runtime-lifecycle.test.ts` | PASS: 4 files, 35 tests |
| `npm test` | PASS: 20 files, 114 tests; the 113-test baseline is preserved plus one W1 test |
| `npm run build` | PASS |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` | PASS: Bubble Bobble boots on desktop Chromium and mobile WebKit, renders frames, and accepts mapped input |
| `git diff --check` | PASS |

The browser smoke required permission to bind its local preview port. It did not use a live signaling/TURN service and is not actual-iPhone evidence.

## Evaluation state

The first independent review found the implementation correct and in scope, but withheld PASS because the original test order released P1 before scoped P2 cleanup. The corrected tests keep P1 active while `releasePlayer(1)` runs and assert that no P1 release occurs.

Final independent re-evaluation returned `PASS` with no Critical, High, Medium, or Low finding. The evaluator independently reran the focused 4-file/35-test set, full 20-file/114-test suite, typecheck, and `git diff --check`, and accepted the fresh build and targeted Bubble Bobble desktop/mobile smoke evidence. W1 is `done`; bounded local W2 work may start.

## Remaining boundary

- W1 does not add a remote input decoder or allowlist; those remain W5/W6 work after the intervening gates.
- W1 does not claim a network lease, disconnect cleanup, WebRTC capture, physical iPhone result, or TURN result.
- W2 physical closure remains blocked until actual-iPhone Gate 1A proves post-ROM OpenAL non-silent energy, tester-audible output, working video, and the allowed host tap count.
