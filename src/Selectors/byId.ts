export function byId<T extends _HasId>(id: Id<T>|undefined) {
    return id ? Game.getObjectById(id) ?? undefined : undefined
}
