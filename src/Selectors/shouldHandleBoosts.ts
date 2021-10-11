import { Objectives } from "Objectives/Objective";
import { byId } from "./byId";
import { getLabs } from "./getLabs";
import { roomPlans } from "./roomPlans";

export function boostLabsToEmpty(office: string) {
    return getLabs(office).boosts.filter(lab => {
        const target = Memory.offices[office].lab.boostingLabs.find(o => o.resource)?.resource;
        const actual = (lab.structure as StructureLab|undefined)?.mineralType
        return actual && actual !== target
    })
}

export function boostLabsToFill(office: string) {
    return getLabs(office).boosts.filter(lab => {
        return !(lab.structure as StructureLab|undefined)?.mineralType
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

    boostCount = Math.max(boostCount, Math.floor(boostsAvailable(office, resource, true, false, false) / 30))

    return [resource, boostCount];
}

export function shouldHandleBoosts(office: string) {
    return boostLabsToEmpty(office).length > 0 || boostLabsToFill(office).length > 0;
}

/**
 * Sum of boosts in labs, Scientist inventories, and Terminal
 */
export function boostsAvailable(office: string, boost: MineralBoostConstant, countReserved = true, countLabs = true, countMinions = true) {
    let total = (
        (countLabs ? getLabs(office).boosts.reduce((sum, lab) => (((lab.structure) as StructureLab)?.store.getUsedCapacity(boost) ?? 0) + sum, 0) : 0) +
        ((roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal)?.store.getUsedCapacity(boost) ?? 0) +
        (countMinions ? Objectives['ScienceObjective'].minions(office).reduce((sum, c) => sum + c.store.getUsedCapacity(boost), 0) : 0)
    );
    if (!countReserved) {
        total -= Memory.offices[office].lab.boosts.reduce((sum, o) => sum + (o.boosts.find(b => b.type === boost)?.count ?? 0), 0)
    }
    return total;
}
