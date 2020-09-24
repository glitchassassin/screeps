import { Transform } from "class-transformer";
import { UpgradeTask } from "tasks/types/UpgradeTask";
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

        let energyToUse = Math.max(
            room.energyAvailable,
            global.analysts.statistics.metrics[room.name].roomEnergyLevels.max()
        );

        if (!this.assignedTo.spawning && !this.spawned) {
            let minion;
            switch (this.type) {
                case MinionTypes.HAULER:
                    minion = new HaulerMinion();
                    break;
                case MinionTypes.PIONEER:
                    minion = new PioneerMinion();
                    break;
                case MinionTypes.MINER:
                    minion = new MinerMinion();
                    break;
                case MinionTypes.UPGRADER:
                    minion = new UpgraderMinion();
                    break;
                case MinionTypes.BUILDER:
                    minion = new BuilderMinion();
                    break;
            }
            if (minion.scaleMinion(room.energyAvailable).length === minion.scaleMinion(energyToUse).length) {
                // Close enough, spawn the minion
                this.spawned = minion.spawn(this.assignedTo, this.memory, energyToUse);
            }
        } else if (!this.assignedTo.spawning && this.spawned) {
            this.completed = true;
        }
    }
}
