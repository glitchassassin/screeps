import { roomPlans } from "Selectors/roomPlans";

export default () => {
    for (let office in Memory.offices) {
        const plan = roomPlans(office);
        const storage = plan?.headquarters?.storage.structure as StructureStorage|undefined;
        const
    }
}
