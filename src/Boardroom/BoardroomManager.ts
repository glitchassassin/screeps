import { deserialize, serialize } from "class-transformer";
import { ClassType } from "class-transformer/ClassTransformer";
import { Boardroom } from "./Boardroom";

export class BoardroomManagerMemory { }

export abstract class BoardroomManager {
    constructor(
        public boardroom: Boardroom
    ) {
        boardroom.register(this);
        this.init();
    }

    cache: BoardroomManagerMemory = new BoardroomManagerMemory();

    /**
     * Load any persistent data from Memory
     *
     * Invoked by constructor after every global reset
     */
    init() {
        if (Memory.boardroom[this.cache.constructor.name]) {
            try {
                this.cache = deserialize(this.cache.constructor as ClassType<BoardroomManagerMemory>, Memory.boardroom[this.cache.constructor.name]);
            }
            catch (e) {
                console.log(`Failed to load ${this.cache.constructor.name} cached data\n${e.stack}`);
            }
        }
    }

    /**
     * Create requests (but don't commit any game changes)
     *
     * Invoked every tick
     */
    plan() { }

    /**
     * Commit persistent data to Memory
     *
     * Invoked every tick
     */
    cleanup() {
        Memory.boardroom[this.cache.constructor.name] = serialize(this.cache);
    }
}
