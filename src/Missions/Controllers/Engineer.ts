import { createEngineerMission, EngineerMission } from "Missions/Implementations/Engineer";
import { MissionStatus, MissionType } from "Missions/Mission";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { costForPlannedStructure, facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
import { getSpawns } from "Selectors/roomPlans";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (!(
      Memory.offices[office].activeMissions.some(m => m.type === MissionType.HARVEST && m.status === MissionStatus.RUNNING) &&
      Memory.offices[office].activeMissions.some(m => m.type === MissionType.LOGISTICS && m.status === MissionStatus.RUNNING)
    )) return; // wait for harvest & logistics

    const queuedMissions = [
      ...Memory.offices[office].pendingMissions.filter(m => m.type === MissionType.ENGINEER),
      ...Memory.offices[office].activeMissions.filter(m => m.type === MissionType.ENGINEER)
    ] as EngineerMission[];

    const idleMissions = queuedMissions.filter(m => m.data.facilitiesTargets.length === 0);

    console.log(JSON.stringify(queuedMissions.map(m => m.data)));

    const missionsRemaining = getSpawns(office).length - queuedMissions.filter(m => m.status !== MissionStatus.RUNNING).length;
    if (missionsRemaining <= 0) return; // Limit pending Engineer missions

    const allocatedCapacity = new Map<PlannedStructure, Map<string, number>>();
    for (const mission of queuedMissions) {
      for (const { target, capacity } of mission.data.facilitiesTargets) {
        const structure = PlannedStructure.deserialize(target);
        const allocations = allocatedCapacity.get(structure) ?? new Map();
        allocations.set(mission.id, capacity);
        allocatedCapacity.set(structure, allocations);
      }
    }

    // Filter down to work still to be done
    const work = facilitiesWorkToDo(office).filter(structure => {
      let { cost } = costForPlannedStructure(structure, office);
      const allocations = allocatedCapacity.get(structure);
      if (!allocations) return true;
      for (const capacity of allocations.values()) {
        cost -= capacity;
        if (cost <= 0) return false;
      }
      return true;
    })

    const assignStructures = (capacity: number) => {
      let capacityRemaining = capacity;
      const structures: {target: string, capacity: number}[] = [];
      let estimatedCost = 0;
      while (work.length) {
        const structure = work.shift();
        if (!structure) break;
        const { cost, efficiency } = costForPlannedStructure(structure, office);
        const costInProgress = [...(allocatedCapacity.get(structure)?.values() ?? [])].reduce((a, b) => a + b, 0);
        const costRemaining = cost - costInProgress;
        if (costRemaining <= 0) continue;

        const adjustedCost = costRemaining / efficiency;

        capacityRemaining -= adjustedCost;
        if (capacityRemaining > 0) {
          // Some capacity remaining
          structures.push(({
            target: structure.serialize(),
            capacity: costRemaining
          }));
          estimatedCost += costRemaining;
        } else {
          // No capacity remaining
          const capacityAllocated = (adjustedCost + capacityRemaining) * efficiency
          structures.push(({
            target: structure.serialize(),
            capacity: capacityAllocated
          }))
          estimatedCost += capacityAllocated;
          // put back on the rack for the next minion
          work.unshift(structure);
          break;
        }
      }
      return {
        structures,
        estimatedCost,
        capacityRemaining
      }
    }

    let newMissions = 0;
    while (newMissions < missionsRemaining && work.length) {
      // Assign to an idle mission, or create a new one
      const mission = idleMissions.shift() ?? createEngineerMission(office);
      // Estimate engineer capacity (W * L)
      const creep = Game.creeps[mission.creepNames[0]];
      let capacity = mission.data.workParts * (creep?.ticksToLive ?? CREEP_LIFE_TIME);

      let { structures, estimatedCost, capacityRemaining } = assignStructures(capacity)

      console.log(mission.creepNames[0], capacity, capacityRemaining, estimatedCost)

      if (structures.length) {
        // create mission with structures so far
        estimatedCost += Math.max(0, capacityRemaining); // surplus capacity will go to upgrading
        mission.estimate.energy += estimatedCost;
        mission.data.facilitiesTargets = structures;
        if (mission.status === MissionStatus.PENDING) {
          Memory.offices[office].pendingMissions.push(mission);
          newMissions += 1;
        }
        for (const structure of structures) {
          allocatedCapacity.get(PlannedStructure.deserialize(structure.target))?.set(mission.id, structure.capacity);
        }
      }
    }
  }
}
