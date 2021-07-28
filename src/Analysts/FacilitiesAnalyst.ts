import { ConstructionSites } from "WorldState/ConstructionSites";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { MemoizeByTick } from "utils/memoize";
import type { Office } from "Office/Office";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { RoomData } from "WorldState/Rooms";
import { RoomPlanData } from "WorldState/RoomPlans";
import { Structures } from "WorldState/Structures";

export class FacilitiesAnalyst {
    @MemoizeByTick((office: Office) => office.name)
    static getEngineers(office: Office) {
        return HRAnalyst.getEmployees(office, 'ENGINEER');
    }
    @MemoizeByTick((office: Office) => office.name)
    static getWorkExpectancy(office: Office) {
        let workExpectancy = 0;
        for (let creep of this.getEngineers(office)) {
            workExpectancy += (creep.getActiveBodyparts(WORK) * (creep.ticksToLive ?? 1500) * 2.5)
        }
        return workExpectancy
    }
    @MemoizeByTick((office: Office) => office.name)
    static getExpectedOutput(office: Office) {
        let expectedOutput = 0;
        for (let creep of this.getEngineers(office)) {
            expectedOutput += (creep.getActiveBodyparts(WORK) * 2.5)
        }
        return expectedOutput
    }
    @MemoizeByTick((office: Office) => office.name)
    static getConstructionSites(office: Office) {
        return ConstructionSites.byOffice(office);
    }
    @MemoizeByTick((office: Office) => office.name)
    static getStructures(office: Office) {
        return Structures.byOffice(office);
    }
    @MemoizeByTick((office: Office) => office.name)
    static getPlannedStructures(office: Office) {
        return this.getPlannedStructuresByRcl(office.name, 8);
    }
    @MemoizeByTick((roomName: string, rcl: number) => `${roomName}${rcl}`)
    static getPlannedStructuresByRcl(roomName: string, rcl: number): PlannedStructure[] {
        const plans = RoomPlanData.byRoom(roomName);
        if (rcl < 0 || !plans) return [];

        let plannedStructures: PlannedStructure[] = [];
        if (RoomData.byRoom(roomName)?.territoryOf) {
            if (!plans.territory) return [];
            plannedStructures = [
                plans.territory.franchise1.container,
                ...plans.territory.franchise1.roads,
            ]
            if (plans.territory.franchise2) {
                plannedStructures.push(
                    plans.territory.franchise2?.container,
                    ...plans.territory.franchise2?.roads,
                )
            }
        } else {
            if (!plans.office) return [];
            let plannedExtensions = [
                ...plans.office.franchise1.extensions,
                ...plans.office.franchise2.extensions,
                ...plans.office.extensions.extensions
            ];

            if (rcl >= 0) {
                plannedStructures = [
                    plans.office.franchise1.container,
                    plans.office.franchise2.container,
                    plans.office.headquarters.container,
                ]
            }
            if (rcl >= 1) {
                plannedStructures.push(
                    plans.office.franchise1.spawn,
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
                    plans.office.headquarters.towers[0],
                )
            }
            if (rcl >= 4) {
                plannedStructures.push(
                    ...plannedExtensions.slice(15, 20),
                    plans.office.headquarters.storage,
                    ...plans.office.franchise1.ramparts,
                    ...plans.office.headquarters.ramparts,
                    ...plans.office.extensions.ramparts,
                    ...plans.office.headquarters.roads
                )
            }
            if (rcl >= 5) {
                plannedStructures.push(
                    ...plannedExtensions.slice(20, 25),
                    plans.office.headquarters.towers[1],
                    plans.office.franchise2.link,
                    plans.office.headquarters.link
                )
            }
            if (rcl >= 6) {
                plannedStructures.push(
                    ...plannedExtensions.slice(25, 30),
                    plans.office.franchise1.link,
                    plans.office.headquarters.terminal,
                    plans.office.mine.extractor,
                    plans.office.mine.container,
                )
            }
            if (rcl >= 7) {
                plannedStructures.push(
                    ...plannedExtensions.slice(30, 35),
                    plans.office.franchise2.spawn,
                    ...plans.office.franchise2.ramparts,
                    plans.office.headquarters.towers[2],
                )
            }
            if (rcl === 8) {
                plannedStructures.push(
                    ...plannedExtensions.slice(35, 40),
                    plans.office.headquarters.spawn,
                    plans.office.headquarters.towers[3],
                    plans.office.headquarters.towers[4],
                    plans.office.headquarters.towers[5],
                )
            }
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

    @MemoizeByTick((office: Office) => office.name)
    static needsStructures(office: Office) {
        // has construction sites which are not roads
        return this.getConstructionSites(office).some(site => site.structureType !== STRUCTURE_ROAD);
    }

    @MemoizeByTick((office: Office) => office.name)
    static needsRoads(office: Office) {
        // has construction sites which are roads
        return this.getConstructionSites(office).some(site => site.structureType === STRUCTURE_ROAD);
    }
}
