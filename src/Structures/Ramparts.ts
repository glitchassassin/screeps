import { totalCreepStats } from 'Selectors/Combat/combatStats';
import { rampartsAreBroken } from 'Selectors/Combat/defenseRamparts';
import { findAlliedCreeps } from 'Selectors/findAlliedCreeps';
import { findHostileCreeps } from 'Selectors/findHostileCreeps';
import { roomPlans } from 'Selectors/roomPlans';

const rampartState = new Map<string, boolean>();

export const runRamparts = () => {
  for (const room in Memory.offices) {
    rampartState.set(
      room,
      roomPlans(room)?.perimeter?.ramparts.some(r => (r.structure as StructureRampart)?.isPublic) ?? false
    );
    if (findHostileCreeps(room).length) {
      if (rampartState.get(room))
        roomPlans(room)?.perimeter?.ramparts.forEach(r => (r.structure as StructureRampart)?.setPublic(false));
    } else if (findAlliedCreeps(room).length) {
      if (!rampartState.get(room))
        roomPlans(room)?.perimeter?.ramparts.forEach(r => (r.structure as StructureRampart)?.setPublic(true));
    }

    // auto safe mode
    if (
      rampartsAreBroken(room) &&
      !Game.rooms[room].controller?.safeMode &&
      Game.rooms[room].controller?.safeModeAvailable &&
      totalCreepStats(findHostileCreeps(room)).score > 30
    ) {
      Game.rooms[room].controller?.activateSafeMode();
    }
  }
};
