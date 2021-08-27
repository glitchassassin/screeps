export const rcl = (room: string) => {
    return Game.rooms[room]?.controller?.level ?? 0
}
