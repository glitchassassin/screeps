import { signRoom } from 'Behaviors/signRoom';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { activeFranchises } from 'Selectors/Franchises/franchiseActive';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { prespawnByArrived, setArrived } from 'Selectors/prespawn';
import { controllerPosition } from 'Selectors/roomCache';

export interface ReserveMissionData extends BaseMissionData {
  reserveTargets?: string[];
  assignments?: Record<string, string>;
}

export class ReserveMission extends MissionImplementation {
  public creeps = {
    marketers: new MultiCreepSpawner('m', this.missionData.office, {
      role: MinionTypes.MARKETER,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.MARKETER](energy),
      count: current => {
        const targets = this.missionData.reserveTargets?.length ?? 0;
        if (current.filter(prespawnByArrived).length < targets) return 1;
        return 0;
      }
    })
  };

  priority = 9;

  constructor(public missionData: ReserveMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: ReserveMission['id']) {
    return super.fromId(id) as ReserveMission;
  }

  run(creeps: ResolvedCreeps<ReserveMission>, missions: ResolvedMissions<ReserveMission>, data: ReserveMissionData) {
    const { marketers } = creeps;

    this.missionData.reserveTargets = [
      ...new Set(activeFranchises(this.missionData.office, 0).map(({ room }) => room))
    ];
    this.missionData.assignments ??= {};
    // remove no longer valid assignments
    const assigned: string[] = [];
    const unassignedCreeps = new Set(marketers.map(c => c.name));
    for (const assignment in this.missionData.assignments) {
      if (!this.missionData.reserveTargets.includes(this.missionData.assignments[assignment])) {
        delete this.missionData.assignments[assignment];
      } else if (!assigned.includes(this.missionData.assignments[assignment])) {
        unassignedCreeps.delete(assignment);
        assigned.push(this.missionData.assignments[assignment]);
      }
    }
    // create new assignments
    for (const target of this.missionData.reserveTargets) {
      if (assigned.includes(target)) continue;
      for (const name of unassignedCreeps) {
        const creep = Game.creeps[name];
        if (!creep.ticksToLive || creep.ticksToLive <= getRangeTo(creep.pos, new RoomPosition(25, 25, target)))
          continue;
        // assign creep
        this.missionData.assignments[name] = target;
        unassignedCreeps.delete(name);
        assigned.push(target);
        break;
      }
    }

    for (const creep of marketers) {
      const target = this.missionData.assignments[creep.name];
      if (!target) continue;
      // Reserve target
      const controllerPos = controllerPosition(target);
      if (!controllerPos) return;

      if (creep.pos.getRangeTo(controllerPos) <= 2) {
        // Set arrived timestamp when in range
        setArrived(creep);
      }

      // Move to controller
      moveTo(creep, { pos: controllerPos, range: 1 });
      if (creep.pos.inRangeTo(controllerPos, 1)) {
        // Reserve controller
        const controller = Game.rooms[target].controller;
        if (controller) {
          creep.reserveController(controller);
        }
        signRoom(creep, target);
      }
    }
  }
}
