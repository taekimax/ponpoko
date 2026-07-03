import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";
import { getStartupAssistSequence } from "../src/startup-assist";

describe("startup assist", () => {
  it("does not send gameplay startup assist for Ponpoko after the warning is handled before controls enable", () => {
    const ponpoko = CATALOG.find((game) => game.id === "ponpoko");

    expect(ponpoko).toBeDefined();
    expect(getStartupAssistSequence(ponpoko!)).toEqual([]);
  });

  it("never sends movement inputs as automatic startup assist", () => {
    for (const game of CATALOG) {
      expect(getStartupAssistSequence(game)).not.toContain("left");
      expect(getStartupAssistSequence(game)).not.toContain("right");
      expect(getStartupAssistSequence(game)).not.toContain("up");
      expect(getStartupAssistSequence(game)).not.toContain("down");
      expect(getStartupAssistSequence(game)).not.toContain("jump");
    }
  });
});
