import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { cachePath } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { getOfficeDistanceByRange } from 'Selectors/getOfficeDistance';
import { adjacentWalkablePositions, getClosestOffice, isHighway, terrainCostAt } from 'Selectors/Map/MapCoordinates';
import { minionCost } from 'Selectors/minionCostPerTick';
import { roomPlans } from 'Selectors/roomPlans';
import { memoizeByTick } from 'utils/memoizeFunction';
import { packPos, unpackPos } from 'utils/packrat';

interface PowerBankReport {
  id: Id<StructurePowerBank>;
  pos: string;
  adjacentSquares: number;
  distance?: number;
  hits: number;
  amount: number;
  expires: number;
  duoSpeed?: number;
  duoCount?: number;
  powerCost?: number;
}

declare global {
  interface OfficeMemory {
    powerbanks: PowerBankReport[];
  }
}

/**
 * Run once per tick
 */
const cleanPowerBankReports = memoizeByTick(
  () => '',
  () => {
    for (const office in Memory.offices) {
      Memory.offices[office].powerbanks ??= [];
      Memory.offices[office].powerbanks = Memory.offices[office].powerbanks.filter(r => {
        if (r.expires < Game.time) return false;
        const pos = unpackPos(r.pos);
        const powerBank = byId(r.id);
        if (Game.rooms[pos.roomName] && !powerBank) return false; // power bank is gone
        if (powerBank) r.hits = powerBank.hits;
        return true;
      });
    }
  }
);

export const evaluatePowerBanks = (room: string) => {
  cleanPowerBankReports();
  if (!isHighway(room)) return;
  const office = getClosestOffice(room, 8);
  if (!office) return;
  const storage = roomPlans(office)?.headquarters?.storage.pos;
  if (!storage) return;
  if (getOfficeDistanceByRange(room, office) < 10) {
    for (const powerBank of Game.rooms[room].find<StructurePowerBank>(FIND_HOSTILE_STRUCTURES, {
      filter: { structureType: STRUCTURE_POWER_BANK }
    })) {
      if (Memory.offices[office].powerbanks.some(r => r.id === powerBank.id)) continue; // already tracked
      Memory.offices[office].powerbanks.push(evaluatePowerBank(office, storage, powerBank));
    }
  }
};

const evaluatePowerBank = (office: string, origin: RoomPosition, powerBank: StructurePowerBank) => {
  const path = cachePath(office + powerBank.id, origin, powerBank.pos, {
    reusePath: powerBank.ticksToDecay + CREEP_LIFE_TIME // path expires after power bank decays
  });
  const distance = path && path.length ? path.reduce((sum, pos) => sum + terrainCostAt(pos), 0) : undefined;
  const report: PowerBankReport = {
    id: powerBank.id,
    pos: packPos(powerBank.pos),
    adjacentSquares: adjacentWalkablePositions(powerBank.pos, true).length,
    distance,
    amount: powerBank.power,
    hits: powerBank.hits,
    expires: powerBank.ticksToDecay + Game.time
  };
  if (!distance) return report;

  // close power banks can be harvested efficiently with two duos that move at half speed
  // all other power banks will need three duos, which may as well move at full speed
  const duoSpeed = distance < 100 ? 2 : 1;
  report.duoSpeed = duoSpeed;

  const duoCount = distance > 330 ? 4 : distance > 100 ? 3 : 2;
  report.duoCount = duoCount;
  const haulerCount = Math.ceil(report.amount / (CARRY_CAPACITY * 25));
  const energy = Game.rooms[office].energyCapacityAvailable;
  const cost =
    minionCost(MinionBuilders[MinionTypes.POWER_BANK_ATTACKER](energy, duoSpeed)) * duoCount +
    minionCost(MinionBuilders[MinionTypes.POWER_BANK_HEALER](energy, duoSpeed)) * duoCount +
    minionCost(MinionBuilders[MinionTypes.ACCOUNTANT](energy, 25, false, false)) * haulerCount;

  const powerCost = cost / report.amount;

  report.powerCost = powerCost;

  return report;
};
