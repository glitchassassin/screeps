declare namespace GreyCompany {
    type CapacityCache = {
        capacity?: number,
        used?: number,
        free?: number
    }
    interface Heap {
        CacheRefreshers: Function[];
        Capacity?: {
            idByRoom: Record<string, Set<string>>;
            data: Record<string, Partial<Record<ResourceConstant, CapacityCache>>>;
        }
    }
}

class Capacity {
    static byId(id: Id<Creep|AnyStoreStructure>, resource: ResourceConstant = RESOURCE_ENERGY) {
        let store = Game.getObjectById(id)?.store as GenericStore
        if (!store) {
            return global.Heap?.Capacity?.data[id][resource] ?? {};
        }
        return {
            capacity: store?.getCapacity(resource) ?? undefined,
            used: store?.getUsedCapacity(resource) ?? undefined,
            free: store?.getFreeCapacity(resource) ?? undefined,
        }
    }
    static refreshCache() {
        // Initialize the Heap branch, if necessary
        global.Heap ??= {CacheRefreshers: []}
        global.Heap.Capacity ??= {idByRoom: {}, data: {}};

        for (let roomName in Game.rooms) {
            // Initialize
            global.Heap.Capacity.idByRoom ??= {};
            let existingIds = new Set(global.Heap.Capacity.idByRoom[roomName]);
            global.Heap.Capacity.idByRoom[roomName] = new Set();

            // We only need to cache if controller is unowned
            if (!Game.rooms[roomName].controller?.my) {
                for (let container of Game.rooms[roomName].find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer[]) {
                    // Update currently cached IDs
                    global.Heap.Capacity.idByRoom[roomName].add(container.id);
                    existingIds.delete(container.id);
                    // Cache capacities for each resource type
                    for (let resource of RESOURCES_ALL) {
                        global.Heap.Capacity.data[container.id] ??= {};
                        global.Heap.Capacity.data[container.id][resource] = {
                            capacity: container.store.getCapacity(resource) ?? undefined,
                            used: container.store.getUsedCapacity(resource) ?? undefined,
                            free: container.store.getFreeCapacity(resource) ?? undefined,
                        }
                    }
                }
            }

            // Clean up any un-cached IDs
            for (let id of existingIds) {
                delete global.Heap.Capacity.data[id];
            }
        }
    }
}

// Register the cache refresh
global.Heap.CacheRefreshers.push(Capacity.refreshCache);
