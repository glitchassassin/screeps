import { Transform } from "class-transformer";
import { transformGameObject } from "utils/transformGameObject";
import { Request } from "../Request";
import { BuilderMinion } from "./minions/BuilderMinion";
import { HaulerMinion } from "./minions/HaulerMinion";
import { MinerMinion } from './minions/MinerMinion';
import { PioneerMinion } from "./minions/PioneerMinion";
import { UpgraderMinion } from "./minions/UpgraderMinion";

export enum MinionTypes {
    PIONEER = 'PIONEER',
    MINER = 'MINER',
    UPGRADER = 'UPGRADER',
    BUILDER = 'BUILDER',
    HAULER = 'HAULER'
}

export class MinionRequest extends Request {
    private spawned = false;
    public sourceId: string|null = null;
    public priority = 5;

    @Transform(transformGameObject(StructureSpawn))
    public assignedTo: StructureSpawn|null = null;

    @Transform((type: string) => MinionTypes[type as MinionTypes])
    public type: MinionTypes|null = null;
    public memory: CreepMemory = {};
    constructor(
        sourceId: string|null = null,
        priority = 5,
        type: MinionTypes|null = null,
        memory: CreepMemory = {}
    ) {
        super();
        this.sourceId = sourceId;
        this.priority = priority;
        this.type = type;
        this.memory = memory;
    }

    fulfill(room: Room) {
        if (!this.type || !this.assignedTo) return;
        if (!this.assignedTo.spawning && !this.spawned) {
            switch (this.type) {
                case MinionTypes.HAULER:
                    this.spawned = (new HaulerMinion())
                        .spawn(this.assignedTo, this.memory, room.energyAvailable);
                    break;
                case MinionTypes.PIONEER:
                    this.spawned = (new PioneerMinion())
                        .spawn(this.assignedTo, this.memory, room.energyAvailable);
                    break;
                case MinionTypes.MINER:
                    this.spawned = (new MinerMinion())
                        .spawn(this.assignedTo, this.memory, room.energyAvailable);
                    break;
                case MinionTypes.UPGRADER:
                    this.spawned = (new UpgraderMinion())
                        .spawn(this.assignedTo, this.memory, room.energyAvailable);
                    break;
                case MinionTypes.BUILDER:
                    this.spawned = (new BuilderMinion())
                        .spawn(this.assignedTo, this.memory, room.energyAvailable);
                    break;
            }
        } else if (!this.assignedTo.spawning && this.spawned) {
            this.completed = true;
        }
    }
}
