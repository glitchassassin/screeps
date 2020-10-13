import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { CarrierMinion } from "./minions/CarrierMinion";
import { EngineerMinion } from "./minions/EngineerMinion";
import { GuardMinion } from "./minions/GuardMinion";
import { InternMinion } from "./minions/InternMinion";
import { LawyerMinion } from "./minions/LawyerMinion";
import { ParalegalMinion } from "./minions/ParalegalMinion";
import { SalesmanMinion } from './minions/SalesmanMinion';

export enum MinionTypes {
    INTERN = 'INTERN',
    SALESMAN = 'SALESMAN',
    PARALEGAL = 'PARALEGAL',
    LAWYER = 'LAWYER',
    ENGINEER = 'ENGINEER',
    CARRIER = 'CARRIER',
    GUARD = 'GUARD'
}

export class MinionRequest {
    completed = false;
    created = Game.time;
    private spawned = false;
    public sourceId: string|null = null;
    public priority = 5;
    public assignedTo: Id<StructureSpawn>|null = null;
    public type: MinionTypes|null = null;
    public memory: CreepMemory = {};
    constructor(
        sourceId: string|null = null,
        priority = 5,
        type: MinionTypes|null = null,
        memory: CreepMemory = {}
    ) {
        this.sourceId = sourceId;
        this.priority = priority;
        this.type = type;
        this.memory = memory;
    }

    fulfill(spawn: StructureSpawn) {
        if (!this.type) return;
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;

        let energyToUse = Math.max(
            spawn.room.energyAvailable,
            statisticsAnalyst.metrics.get(spawn.room.name)?.roomEnergyLevels.max() || 0
        );

        if (!spawn.spawning && !this.spawned) {
            let minion;
            switch (this.type) {
                case MinionTypes.CARRIER:
                    minion = new CarrierMinion();
                    break;
                case MinionTypes.INTERN:
                    minion = new InternMinion();
                    break;
                case MinionTypes.SALESMAN:
                    minion = new SalesmanMinion();
                    break;
                case MinionTypes.PARALEGAL:
                    minion = new ParalegalMinion();
                    break;
                case MinionTypes.LAWYER:
                    minion = new LawyerMinion();
                    break;
                case MinionTypes.ENGINEER:
                    minion = new EngineerMinion();
                    break;
                case MinionTypes.GUARD:
                    minion = new GuardMinion();
                    break;
            }
            if (minion.scaleMinion(spawn.room.energyAvailable).length === minion.scaleMinion(energyToUse).length) {
                // Close enough, spawn the minion
                this.spawned = minion.spawn(
                    spawn,
                    {...this.memory, office: spawn.room.name},
                    energyToUse);
            }
        } else if (!spawn.spawning && this.spawned) {
            this.completed = true;
        }
    }
}
