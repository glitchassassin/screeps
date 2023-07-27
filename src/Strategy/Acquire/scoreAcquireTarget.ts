import { countTerrainTypes, isSourceKeeperRoom } from 'Selectors/Map/MapCoordinates';
import { getRoomPathDistance } from 'Selectors/Map/getRoomPathDistance';
import { ownedMinerals } from 'Selectors/ownedMinerals';
import { sourceIds } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';
import { ACQUIRE } from '../constants';

/**
 * Higher score is better
 */
export function scoreAcquireTarget(room: string) {
  let score = 0;

  // check minerals we own
  const mineral = Memory.rooms[room].mineralType;
  let mineralScorePercent = 1;
  if (mineral) {
    let mineralScore =
      ACQUIRE.MINERAL_PRIORITIES.indexOf(mineral) +
      (ownedMinerals().has(mineral) ? ACQUIRE.MINERAL_PRIORITIES.length : 0);
    mineralScorePercent = 1 - mineralScore / (ACQUIRE.MINERAL_PRIORITIES.length * 2 - 1);
  }
  score += mineralScorePercent * ACQUIRE.SCORE_WEIGHT.MINERAL_TYPE;

  // Check number of ramparts
  const ramparts = roomPlans(room)?.perimeter?.ramparts.length ?? 100; // if undefined, bad score anyways
  // score of 1 for 0 ramparts down to 0 for 50 ramparts
  const rampartScorePercent = Math.max(0, Math.min(1, (50 - ramparts) / 50));
  score += rampartScorePercent * ACQUIRE.SCORE_WEIGHT.RAMPART_COUNT;

  // TODO: check number of franchises inside perimeter

  // Check number of swamps
  const { swamp } = countTerrainTypes(room);
  // score of 1 for 0 swamps down to 0 for 1000 swamps
  const swampScorePercent = Math.max(0, Math.min(1, (1000 - swamp) / 1000));
  score += swampScorePercent * ACQUIRE.SCORE_WEIGHT.SWAMP_COUNT;

  // TODO: check number of available immediately adjacent remotes
  const remotes = Object.values(Game.map.describeExits(room) ?? {})
    .map(r => (isSourceKeeperRoom(r) ? 0 : sourceIds(r).length))
    .reduce((a, b) => a + b, 0);
  const remoteScorePercent = remotes / (4 * 2); // 4 remotes * 2 sources is theoretical best
  score += remoteScorePercent * ACQUIRE.SCORE_WEIGHT.REMOTE_COUNT;

  // Weight based on distance to closest office
  const distance = Object.keys(Memory.offices)
    .filter(r => Game.rooms[r].energyCapacityAvailable >= 850)
    .map(office => getRoomPathDistance(office, room))
    .filter((d): d is number => d !== undefined)
    .reduce((a, b) => Math.min(a, b), 0);
  const distanceScorePercent = 1 - Math.max(0, Math.min(1, Math.abs(4 - distance) / 4));
  score += distanceScorePercent * ACQUIRE.SCORE_WEIGHT.DISTANCE;

  // TODO: check proximity to hostile rooms/remotes
  return score;
}
