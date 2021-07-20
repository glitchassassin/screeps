import { ExtensionsPlan } from "./ExtensionsPlan"
import { FranchisePlan } from "./FranchisePlan"
import { HeadquartersPlan } from "./HeadquartersPlan"
import { MapAnalyst } from "Analysts/MapAnalyst"
import { MinePlan } from "./MinePlan"
import { PlannedStructure } from "./classes/PlannedStructure"
import { Route } from "WorldState/LogisticsRouteModel"
import { TerritoryFranchisePlan } from "./TerritoryFranchise"

const getNearestNeighborsRoute = (start: RoomPosition, targets: PlannedStructure[]) => {
    let route = {
        nodes: [] as PlannedStructure[],
        length: 0
    }

    let nodes = [...targets];

    let lastPoint = start;
    while (nodes.length > 0) {
        let shortest = nodes.map(s => {
            let path = PathFinder.search(
                lastPoint,
                {pos: s.pos, range: 1},
                {
                    roomCallback: n => MapAnalyst.getCostMatrix(n),
                    plainCost: 2,
                    swampCost: 10,
                }
            )

            if (path.incomplete) throw new Error(`Unable to generate logistics route from ${lastPoint} to ${s.pos}`);

            return {s, length: path.cost}
        }).reduce((a, b) => (!b || a.length < b.length) ? a : b);

        route.nodes.push(shortest.s);
        route.length += shortest.length;
        nodes = nodes.filter(s => s !== shortest.s);
        lastPoint = shortest.s.pos
    }

    return route;
}

export const generateSourceRoute = (franchise1: FranchisePlan, franchise2: FranchisePlan, mine: MinePlan, headquarters: HeadquartersPlan): Route => {
    let route = getNearestNeighborsRoute(headquarters.storage.pos, [
        franchise1.container,
        franchise2.container,
        mine.container,
    ])

    return {
        sources: route.nodes,
        destinations: [headquarters.storage],
        length: route.length,
    }
}

export const generateTerritorySourceRoute = (headquarters: HeadquartersPlan, franchise1: TerritoryFranchisePlan, franchise2?: TerritoryFranchisePlan): Route => {
    let route;
    if (!franchise2) {
        route = getNearestNeighborsRoute(headquarters.storage.pos, [franchise1.container])
    } else {
        route = getNearestNeighborsRoute(headquarters.storage.pos, [
            franchise1.container,
            franchise2.container,
        ])
    }

    return {
        sources: route.nodes,
        destinations: [headquarters.storage],
        length: route.length
    }
}

export const generateTowersRoute = (headquarters: HeadquartersPlan) => {
    let route = getNearestNeighborsRoute(headquarters.storage.pos, [...headquarters.towers])

    return {
        sources: [headquarters.storage],
        destinations: route.nodes,
        length: route.length
    }
}

export const generateControllerRoute = (headquarters: HeadquartersPlan) => {
    return {
        sources: [headquarters.storage],
        destinations: [headquarters.container],
        length: 1
    }
}

export const generateExtensionsRoute = (franchise1: FranchisePlan, franchise2: FranchisePlan, headquarters: HeadquartersPlan, extensions: ExtensionsPlan) => {
    let route = getNearestNeighborsRoute(headquarters.storage.pos, [
        franchise1.spawn,
        franchise2.spawn,
        headquarters.spawn,
        ...franchise1.extensions,
        ...franchise2.extensions,
        ...extensions.extensions
    ]);

    return {
        sources: [headquarters.storage],
        destinations: route.nodes,
        length: route.length
    }
}
