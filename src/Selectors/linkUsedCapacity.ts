export const linkUsedCapacity = (link: StructureLink|undefined) => {
    if (!link) return 0;
    return link.store.getUsedCapacity(RESOURCE_ENERGY) / link.store.getCapacity(RESOURCE_ENERGY)
}
