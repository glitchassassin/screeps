import { Transform, Type } from "class-transformer";
import { Request } from "../Request";
import { BuilderMinion } from "./minions/BuilderMinion";
import { MinerMinion } from './minions/MinerMinion';
import { UpgraderMinion } from "./minions/UpgraderMinion";

export enum MinionTypes {
    MINER = 'MINER',
    UPGRADER = 'UPGRADER',
    BUILDER = 'BUILDER',
}

export class MinionRequest extends Request {
    private spawned = false;
    public sourceId: string|null = null;
    public priority = 5;

    @Transform((type: string) => MinionTypes[type as MinionTypes])
    public type: MinionTypes|null = null;
    public memory: CreepMemory = {};
    constructor(
        sourceId: string|null = null,
        priority = 5,
        type: MinionTypes|null = null,
        memory: CreepMemory = {}
    ) {
        super(sourceId);
        this.priority = priority;
        this.type = type;
        this.memory = memory;
    }

    fulfill = (room: Room) => {
        if (!this.type || !this.assignedTo) return;
        this.assignedTo.forEach(spawnId => {
            let spawn = Game.getObjectById(spawnId as Id<StructureSpawn>);
            if (!spawn) return;
            if (!spawn.spawning && !this.spawned) {
                switch (this.type) {
                    case MinionTypes.MINER:
                        this.spawned = (new MinerMinion())
                            .spawn(spawn, this.memory, room.energyAvailable);
                        break;
                    case MinionTypes.UPGRADER:
                        this.spawned = (new UpgraderMinion())
                            .spawn(spawn, this.memory, room.energyAvailable);
                        break;
                    case MinionTypes.BUILDER:
                        this.spawned = (new BuilderMinion())
                            .spawn(spawn, this.memory, room.energyAvailable);
                        break;
                }
            } else if (!spawn.spawning && this.spawned) {
                this.completed = true;
            }
        })
    }
}
