import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";

export interface Route {
    sources: PlannedStructure[];
    destinations: PlannedStructure[];
    length: number;
}
export interface SerializedRoute {
    sources: string;
    destinations: string;
    length: number;
}

export const serializeRoute = (route: Route): SerializedRoute => {
    return {
        sources: route.sources.reduce((s, struct) => s + struct.serialize(), ''),
        destinations: route.destinations.reduce((s, struct) => s + struct.serialize(), ''),
        length: route.length
    }
}
export const deserializeRoute = (route: SerializedRoute): Route => {
    let r: Route = {
        sources: [],
        destinations: [],
        length: route.length,
    }
    for (let i = 0; i < route.sources.length; i += 27) {
        r.sources.push(PlannedStructure.deserialize(route.sources.slice(i, i+27)));
    }
    for (let i = 0; i < route.destinations.length; i += 27) {
        r.destinations.push(PlannedStructure.deserialize(route.destinations.slice(i, i+27)));
    }
    return r;
}
