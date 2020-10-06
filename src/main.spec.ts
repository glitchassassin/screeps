import {assert} from "chai";
import {Game, Memory} from "../test/unit/mock"
import { mockGlobal } from "screeps-jest";

mockGlobal<Game>('Game', Game, true);
mockGlobal<Memory>('Memory', Memory, true);
global.IS_JEST_TEST = true;

import {loop} from "./main";

describe("main", () => {
  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    mockGlobal<Game>('Game', Game, true);
    // @ts-ignore : allow adding Memory to global
    mockGlobal<Memory>('Memory', Memory, true);
  });

  it("should export a loop function", () => {
    assert.isTrue(typeof loop === "function");
  });

  it("should return void when called with no context", () => {
    assert.isUndefined(loop());
  });
});
