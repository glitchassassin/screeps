import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { roomPlans } from "./roomPlans";

export const plannedStructuresByRcl = (officeName: string, targetRcl?: number) => {
    const plans = roomPlans(officeName)?.office;
    const rcl = targetRcl ?? Game.rooms[officeName]?.controller?.level;
    if (!rcl || !plans) return [];

    let plannedStructures: PlannedStructure[] = [];
    let plannedExtensions = [
        ...plans.franchise1.extensions,
        ...plans.franchise2.extensions,
        ...plans.extensions.extensions
    ];
    // Sort already constructed structures to the top
    plannedExtensions = [
        ...plannedExtensions.filter(e => e.structure),
        ...plannedExtensions.filter(e => !e.structure),
    ];
    let plannedTowers = [
        ...plans.headquarters.towers.filter(t => t.structure),
        ...plans.headquarters.towers.filter(t => !t.structure),
    ]

    if (rcl >= 0) {
        plannedStructures = [
            plans.franchise1.container,
            plans.franchise2.container,
        ]
    }
    if (rcl >= 1) {
        plannedStructures.push(
            plans.franchise1.spawn,
        )
    }
    if (rcl >= 2) {
        plannedStructures.push(
            ...plannedExtensions.slice(0, 5),
        )
    }
    if (rcl >= 3) {
        plannedStructures.push(
            ...plannedExtensions.slice(5, 10),
            plannedTowers[0],
        )
    }
    if (rcl >= 4) {
        plannedStructures.push(
            ...plannedExtensions.slice(10, 20),
            plans.headquarters.storage,
            plans.headquarters.container,
            ...plans.franchise1.ramparts,
            ...plans.headquarters.ramparts,
            ...plans.extensions.ramparts,
            ...plans.headquarters.roads
        )
    }
    if (rcl >= 5) {
        plannedStructures.push(
            ...plannedExtensions.slice(20, 30),
            plannedTowers[1],
            plans.franchise2.link,
            plans.headquarters.link
        )
    }
    if (rcl >= 6) {
        plannedStructures.push(
            ...plannedExtensions.slice(30, 40),
            plans.franchise1.link,
            plans.headquarters.terminal,
            plans.mine.extractor,
            plans.mine.container,
        )
    }
    if (rcl >= 7) {
        plannedStructures.push(
            ...plannedExtensions.slice(40, 50),
            plans.franchise2.spawn,
            ...plans.franchise2.ramparts,
            plannedTowers[2],
        )
    }
    if (rcl === 8) {
        plannedStructures.push(
            ...plannedExtensions.slice(50, 60),
            plans.headquarters.spawn,
            plannedTowers[3],
            plannedTowers[4],
            plannedTowers[5],
        )
    }
    if (rcl >= 4) {
        // No ramparts on roads, walls, ramparts, extractors, or extensions
        // Perimeter extensions have ramparts already
        const nonRampartedStructures: StructureConstant[] = [STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_EXTRACTOR, STRUCTURE_EXTENSION]
        for (let s of plannedStructures) {
            if (!nonRampartedStructures.includes(s.structureType)) {
                plannedStructures.push(new PlannedStructure(s.pos, STRUCTURE_RAMPART))
            }
        }
    }
    return plannedStructures
}
