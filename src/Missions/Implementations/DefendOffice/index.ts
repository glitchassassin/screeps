import { MinionTypes } from 'Minions/minionTypes';
import { Mission, MissionType } from 'Missions/Mission';
import { activeMissions, assignedCreep, isMission } from 'Missions/Selectors';
import { moveTo } from 'screeps-cartographer';
import { rampartsAreBroken } from 'Selectors/Combat/defenseRamparts';
import { priorityKillTarget } from 'Selectors/Combat/priorityTarget';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { getCostMatrix } from 'Selectors/Map/Pathing';
import { closestRampartSection } from 'Selectors/perimeter';
import { isCreep } from 'Selectors/typeguards';
import { MissionImplementation } from '../MissionImplementation';

export type DefendOfficeRoles = MinionTypes.GUARD | MinionTypes.MEDIC;

interface DefendOfficeMissionData {
  role: DefendOfficeRoles;
}

export interface DefendOfficeMission extends Mission<MissionType.DEFEND_OFFICE> {
  data: DefendOfficeMissionData;
}

export class DefendOffice extends MissionImplementation {
  static minionLogic(mission: DefendOfficeMission, creep: Creep) {
    if (!creep.memory.squad && mission.data.role in this.soloRoles) {
      this.soloRoles[mission.data.role](mission, creep);
    }
  }

  /**
   * Solo roles - if the duo squad gets broken, fall back to these behaviors
   */
  static soloRoles: Record<DefendOfficeRoles, (mission: DefendOfficeMission, creep: Creep) => void> = {
    [MinionTypes.GUARD]: (mission: DefendOfficeMission, creep: Creep) => {
      const target = priorityKillTarget(mission.office);
      if (!target) return;

      // if ramparts aren't broken, stay inside perimeter

      if (!rampartsAreBroken(mission.office)) {
        const moveTarget = closestRampartSection(target.pos);
        if (moveTarget)
          moveTo(
            creep,
            moveTarget.map(pos => ({ pos, range: 0 })),
            {
              avoidObstacleStructures: false, // handled by our own cost matrix
              maxRooms: 1,
              roomCallback(room) {
                return getCostMatrix(room, false, {
                  stayInsidePerimeter: true
                });
              }
            }
          );
      } else {
        moveTo(creep, { pos: target.pos, range: 1 });
      }

      if (creep.attack(target) !== OK && creep.hits < creep.hitsMax) {
        creep.heal(creep);
      }
    },
    [MinionTypes.MEDIC]: (mission: DefendOfficeMission, creep: Creep) => {
      // const start = Game.cpu.getUsed();
      // Move to most damaged guard and heal
      const healTargets = activeMissions(mission.office)
        .filter(isMission(MissionType.DEFEND_OFFICE))
        .map(assignedCreep)
        .filter(isCreep);

      // console.log(`${mission.type} ${mission.data.role} healTargets: ${Game.cpu.getUsed() - start}`);
      if (healTargets.length === 0) return;

      const sortedTargets = healTargets.sort((a, b) => b.hitsMax - b.hits - (a.hitsMax - a.hits));

      const target = sortedTargets[0];

      const rampartsIntact = !rampartsAreBroken(mission.office);

      // console.log(`${mission.type} ${mission.data.role} rampartsIntact: ${Game.cpu.getUsed() - start}`);

      moveTo(
        creep,
        { pos: target.pos, range: 1 },
        {
          avoidObstacleStructures: false, // handled by our own cost matrix
          maxRooms: 1,
          roomCallback(room) {
            return getCostMatrix(room, false, {
              stayInsidePerimeter: rampartsIntact
            });
          }
        }
      );

      // console.log(`${mission.type} ${mission.data.role} moveTo ${creep.pos}-${target.pos}: ${Game.cpu.getUsed() - start}`);
      const range = getRangeTo(creep.pos, target.pos);
      if (range > 3) {
        // Try to heal someone else adjacent
        const secondaryTarget = sortedTargets.find(c => getRangeTo(creep.pos, c.pos) <= 1);
        if (secondaryTarget) {
          creep.heal(secondaryTarget);
        } else {
          // Or else someone else in range
          const tertiaryTarget = sortedTargets.find(c => getRangeTo(creep.pos, c.pos) <= 3);
          if (tertiaryTarget) creep.heal(tertiaryTarget);
        }
      } else if (range > 1) {
        creep.rangedHeal(target);
      } else {
        creep.heal(target);
      }
    }
  };
}
