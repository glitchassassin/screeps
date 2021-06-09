import { mockGlobal } from "screeps-jest";

export const Game = {
  creeps: {},
  rooms: {},
  spawns: {},
  time: 12345,
  gcl: {},
  cpu: {
    getUsed: jest.fn()
  }
};

export const Memory = {
  creeps: {}
};

export const RawMemory = {
  _parsed: {}
};

mockGlobal<Game>('Game', Game, true);
mockGlobal<Memory>('Memory', Memory, true);
mockGlobal<RawMemory>('RawMemory', RawMemory, true);
