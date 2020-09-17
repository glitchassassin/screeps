import 'reflect-metadata';
import { mockGlobal, mockInstanceOf } from 'screeps-jest';
import {assert} from "chai";
import { Task } from "tasks/Task";
import { TaskPrerequisite } from "tasks/TaskPrerequisite";
import { resolveTaskTrees } from "tasks/TaskTree";
import { TaskAction } from './TaskAction';
import { TaskRequest } from './TaskRequest';
import { deserialize, serialize } from 'class-transformer';

describe("TaskTree", () => {
  beforeEach(() => {
    // runs before each test in this block
    mockGlobal<Game>('Game', {
      creeps: {},
      rooms: {},
      spawns: {},
      time: 12345
    }, true)
    mockGlobal<Memory>('Memory', {
      creeps: {},
    }, true)
  });

  it("should serialize", () => {
      console.log(serialize( new TaskRequest("test", new TaskAction())));
  });

  it("should deserialize", () => {
      let json = serialize( new TaskRequest("test", new TaskAction()));
      console.log(deserialize(TaskRequest, json));
  });
});
