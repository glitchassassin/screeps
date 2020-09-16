import {assert} from "chai";
import { Task } from "tasks/Task";
import { resolveTaskTrees } from "tasks/TaskTree";
import {loop} from "../../src/main";
import {Game, Memory} from "./mock"


describe("TaskTree", () => {
  before(() => {
    // runs before all test in this block
  });

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    global.Game = _.clone(Game);
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory);
  });

  it("should run", () => {
    let minion = {
      capacity: 0,
      capacityUsed: 0,
      pos: new RoomPosition(0, 0, 'world'),
      creep: new Creep('creep' as Id<Creep>),
    }
    assert.isOk(resolveTaskTrees(minion, new Task(minion.creep)));
  });
});
