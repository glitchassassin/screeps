import { Request } from "../Request";
import { MinerMinion } from './minions/MinerMinion';
import { UpgraderMinion } from "./minions/UpgraderMinion";

export enum MinionTypes {
    MINER = 'MINER',
    UPGRADER = 'UPGRADER'
}

export class MinionRequest extends Request {
    private spawned = false;
    constructor(
        public sourceId: string|null = null,
        public priority = 5,
        public type: MinionTypes|null = null,
        public memory: CreepMemory = {}
    ) { super(sourceId); }

    fulfill = (room: Room) => {
        if (!this.type || !this.assignedTo) return;
        this.assignedTo.forEach(spawnId => {
            let spawn = Game.getObjectById(spawnId as Id<StructureSpawn>);
            if (!spawn) return;
            if (!spawn.spawning && !this.spawned) {
                switch (this.type) {
                    case MinionTypes.MINER:
                        this.spawned = (new MinerMinion())
                            .spawn(spawn, this.memory, spawn?.store[RESOURCE_ENERGY]);
                        break;
                    case MinionTypes.UPGRADER:
                        this.spawned = (new UpgraderMinion())
                            .spawn(spawn, this.memory, spawn?.store[RESOURCE_ENERGY]);
                        break;
                }
            } else if (!spawn.spawning && this.spawned) {
                this.completed = true;
            }
        })
    }

    serialize = () => {
        return Request.prototype.serialize.call(this, {
            requestType: this.constructor.name,
            type: this.type,
            memory: this.memory,
            spawned: this.spawned,
        });
    }
    deserialize = (task: any) => {
        Request.prototype.deserialize.call(this, task);
        this.type = task.type;
        this.memory = task.memory;
        this.spawned = task.spawned;
        return this;
    }
}
