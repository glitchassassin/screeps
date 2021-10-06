import { roomPlans } from "./roomPlans";

export function terminalBalance(office: string, resource: ResourceConstant) {
    return (roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal|undefined)?.store.getUsedCapacity(resource) ?? 0
}
