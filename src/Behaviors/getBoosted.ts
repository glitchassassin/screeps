import { FEATURES } from 'config';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { LabMineralConstant } from 'Structures/Labs/LabOrder';
import { States } from './states';

export const getBoosted =
  <T extends States>(nextState: T) =>
  ({ office }: { office: string }, creep: Creep) => {
    // If no Scientists are on duty, skip
    if (!FEATURES.LABS) return nextState;

    // Check if boosts are completed
    const boosts = creep.body.reduce((map, part) => {
      if (part.boost)
        map.set(part.boost as LabMineralConstant, (map.get(part.boost as LabMineralConstant) ?? 0) + LAB_BOOST_MINERAL);
      return map;
    }, new Map<LabMineralConstant, number>());
    const outstanding =
      Memory.offices[office].lab.boosts
        .find(o => o.name === creep.name)
        ?.boosts.filter(b => (boosts.get(b.type) ?? 0) < b.count) ?? [];
    // We don't need to check count, only completeness
    if (outstanding.length === 0) {
      // All boosts accounted for, we're done
      Memory.offices[office].lab.boosts = Memory.offices[office].lab.boosts.filter(o => o.name !== creep.name);
      // console.log(office, 'Boosted creep', creep.name, 'with', creep.ticksToLive, 'ticks remaining');
      return nextState;
    }

    // We still have some boosts outstanding
    const targetLab = Memory.offices[office].lab.boostingLabs.find(l => {
      const targetBoost = outstanding.find(b => b.type === l.resource);
      if (!targetBoost) return false;
      const lab = byId(l.id);
      if (lab?.mineralType !== targetBoost.type || lab.store.getUsedCapacity(lab.mineralType) < targetBoost.count)
        return false;
      return true;
    });
    const lab = byId(targetLab?.id);
    if (lab) {
      moveTo(creep, { pos: lab.pos, range: 1 });
      if (creep.pos.inRangeTo(lab, 1)) {
        const result = lab.boostCreep(creep);
        // console.log(creep.name, lab.mineralType, 'result', result);
      }
    }
    return States.GET_BOOSTED;
  };
