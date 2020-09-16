import {assert} from "chai";
import {loop} from "./main";
import {Game, Memory} from "../test/unit/mock"
import { mockGlobal } from "screeps-jest";

describe("main", () => {
  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    mockGlobal<Game>('Game', Game);
    // @ts-ignore : allow adding Memory to global
    mockGlobal<Memory>('Memory', Memory);
  });

  it("should export a loop function", () => {
    assert.isTrue(typeof loop === "function");
  });

  it("should return void when called with no context", () => {
    assert.isUndefined(loop());
  });
});
