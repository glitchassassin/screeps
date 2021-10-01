import { Objectives } from "Objectives/Objective";
import { byId } from "./byId";
import { getLabs } from "./getLabs";
import { roomPlans } from "./roomPlans";

export function boostLabsToEmpty(office: string) {
    return getLabs(office).boosts.filter(lab => {
        const target = Memory.offices[office].lab.boostingLabs.find(o => o.resource)?.resource;
        const actual = Object.keys(((lab.structure as StructureLab|undefined)?.store ?? {}))[0]
        return actual && actual !== target
    })
}

export function boostLabsToFill(office: string) {
    return getLabs(office).boosts.filter(lab => {
        const store = (lab.structure as StructureLab|undefined)?.store;
        return (store?.getFreeCapacity() ?? 0) > 0 && Object.keys((store ?? {}))[0] === undefined
    })
}

export function boostsNeededForLab(office: string, labId: Id<StructureLab>|undefined): [MineralBoostConstant, number]|[] {
    const resource = Memory.offices[office].lab.boostingLabs.find(l => l.id === labId)?.resource
    if (!resource || !labId) return [];

    const boostOrders = Memory.offices[office].lab.boosts;

    let boostCount = 0;

    for (const order of boostOrders) {
        // Subtract any already-boosted parts from the orders
        const c = byId(order.id);
        let orderResources = order.boosts.reduce((sum, boost) =>
            boost.type === resource ? boost.count : 0
        , 0)
        if (!c) continue;
        c.body.forEach(part => {
            if (part.boost === resource) orderResources -= 1
        })

        boostCount += Math.max(0, orderResources);
    }

    // Cap at amount actually available in local economy

    boostCount = Math.max(boostCount, Math.floor(boostsAvailable(office, resource) / 30))

    return [resource, boostCount * LAB_BOOST_MINERAL];
}

export function shouldHandleBoosts(office: string) {
    return boostLabsToEmpty(office) || boostLabsToFill(office);
}

/**
 * Sum of boosts in labs, Scientist inventories, and Terminal
 */
export function boostsAvailable(office: string, boost: MineralBoostConstant) {
    return (
        getLabs(office).boosts.reduce((sum, lab) => (((lab.structure) as StructureLab)?.store.getUsedCapacity(boost) ?? 0) + sum, 0) +
        ((roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal)?.store.getUsedCapacity(boost) ?? 0) +
        Objectives['ScienceObjective'].minions(office).reduce((sum, c) => sum + c.store.getUsedCapacity(boost), 0)
    );
}
