export const resourcesNearPos = (pos: RoomPosition, radius = 1, resource?: ResourceConstant) => {
    const results = Game.rooms[pos.roomName]?.lookForAtArea(
        LOOK_RESOURCES,
        pos.y - radius,
        pos.x - radius,
        pos.y + radius,
        pos.x + radius,
        true
    )
    return results?.map(r => r.resource).filter(r => !resource || r.resourceType === resource).sort((a, b) => b.amount - a.amount) ?? []
}
