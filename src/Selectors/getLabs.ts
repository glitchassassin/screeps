import { roomPlans } from "./roomPlans";

export const getLabs = (office: string) => {
    const labs = roomPlans(office)?.labs?.labs ?? [];
    const boostLabs = labs.filter(l => Memory.offices[office].lab.boostingLabs.some(b => b.id === l.structureId));
    const reactionLabs = labs.filter(l => !boostLabs.includes(l));
    return {
        inputs: reactionLabs.slice(0, 2),
        outputs: reactionLabs.slice(2),
        boosts: boostLabs,
    }
}
