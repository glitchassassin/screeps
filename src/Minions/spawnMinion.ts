import { States } from "Behaviors/states";
import { FEATURES } from "config";
import { defaultDirectionsForSpawn } from "Selectors/defaultDirectionsForSpawn";
import { isPositionWalkable } from "Selectors/Map/MapCoordinates";
import { minionCost } from "Selectors/minionCostPerTick";
import { getSpawns } from "Selectors/roomPlans";
import { boostsAvailable } from "Selectors/shouldHandleBoosts";
import { getEnergyStructures } from "Selectors/spawnsAndExtensionsDemand";
import { MinionTypes } from "./minionTypes";


let spawningCache = new Map<Id<StructureSpawn>, number>();

/**
 * @returns Energy used to spawn minion
 */
export const spawnMinion = (
    office: string,
    objective: string,
    minionType: MinionTypes,
    body: BodyPartConstant[],
    boosts: MineralBoostConstant[] = []
) => (opts: {
    preferredSpawn?: StructureSpawn,
    allowOtherSpawns?: boolean, // Default: true
    preferredSpaces?: RoomPosition[],
    allowOtherSpaces?: boolean, // Default: true
} = {}) => {
    // console.log(office, objective, 'spawning', minionType);
    // check parameters
    if (body.length === 0) return 0;
    // select spawn
    let spawn: StructureSpawn|undefined;
    let directions: DirectionConstant[] = [];
    if (opts.preferredSpawn && spawningCache.get(opts.preferredSpawn.id) !== Game.time && !opts.preferredSpawn.spawning) {
        spawn = opts.preferredSpawn
        // select direction
        if (opts.preferredSpaces) {
            for (let pos of opts.preferredSpaces) {
                // Only select open directions
                if (isPositionWalkable(pos, false, false)) {
                    directions.push(spawn.pos.getDirectionTo(pos))
                }
            }
        }
        if (opts.allowOtherSpaces !== false) {
            directions = directions.concat(defaultDirectionsForSpawn(office, spawn))
        }
    } else if (opts.allowOtherSpawns !== false) {
        spawn = getSpawns(office).find(s => !s.spawning && spawningCache.get(s.id) !== Game.time && !s.spawning)
        directions = spawn ? defaultDirectionsForSpawn(office, spawn) : []
    }
    if (!spawn) return 0; // No valid spawn available

    const name = `${minionType}-${office}-${Game.time % 10000}-${spawn.id.slice(23)}`;

    // Schedule boosts, if applicable
    let state: States | undefined = undefined;
    for (const resource of boosts) {
        const part = Object.entries(BOOSTS).find(([k, v]) => resource in v)?.[0] as BodyPartConstant | undefined;
        if (!part) continue;
        let available = FEATURES.LABS && boostsAvailable(office, resource, false);
        const workParts = body.filter(p => p === part).length
        const target = workParts * LAB_BOOST_MINERAL;
        if (available && available >= target) {
            // We have enough minerals, enter a boost order
            Memory.offices[office].lab.boosts.push({
                boosts: [{
                    type: resource,
                    count: target
                }],
                name
            })
            state = States.GET_BOOSTED;
        }
    }

    // try to spawn minion
    const r = spawn.spawnCreep(
        body,
        name,
        {
            memory: {
                type: minionType,
                office,
                objective,
                state
            },
            energyStructures: getEnergyStructures(office),
            directions
        }
    )
    if (r === OK || r === ERR_NOT_ENOUGH_ENERGY || r === ERR_BUSY) spawningCache.set(spawn.id, Game.time)
    // console.log(office, minionType, r, JSON.stringify(body))
    const cost = (r === OK) ? minionCost(body) : 0;
    return cost;
}
