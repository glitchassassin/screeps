export function byId<T>(id: Id<T>|undefined) {
    return id ? Game.getObjectById(id) ?? undefined : undefined
}
