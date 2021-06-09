import { Game, Memory } from "../test/unit/mock";
import { describe, expect } from '@jest/globals';

import { loop } from "./main";
import { mockGlobal } from "screeps-jest";

global.IS_JEST_TEST = true;

describe("main", () => {
  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    mockGlobal<Game>('Game', Game, true);
    // @ts-ignore : allow adding Memory to global
    mockGlobal<Memory>('Memory', Memory, true);
  });

  it("should export a loop function", () => {
    expect(typeof loop === "function").toBeTruthy();
  });

  it("should return void when called with no context", () => {
    expect(loop()).toBeUndefined();
  });
});
