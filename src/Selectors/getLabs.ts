import { roomPlans } from "./roomPlans";

export const getLabs = (office: string) => {
    const labs = roomPlans(office)?.labs?.labs ?? [];
    return {
        inputs: labs.slice(0, 2),
        outputs: labs.slice(2)
    }
}
