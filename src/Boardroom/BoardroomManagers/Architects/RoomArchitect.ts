import { CachedRoom, RoomData } from 'WorldState/Rooms';
import { generateControllerRoute, generateExtensionsRoute, generateSourceRoute, generateTerritorySourceRoute, generateTowersRoute } from './LogisticsRoutePlan';

import { BlockPlan } from './classes/BlockPlan';
import { BoardroomManager } from 'Boardroom/BoardroomManager';
import { Controllers } from 'WorldState/Controllers';
import { ExtensionsPlan } from './ExtensionsPlan';
import { FranchisePlan } from './FranchisePlan';
import { HeadquartersPlan } from './HeadquartersPlan';
import { LogisticsRouteData } from 'WorldState/LogisticsRoutes';
import { MapAnalyst } from 'Analysts/MapAnalyst';
import { MinePlan } from './MinePlan';
import { Minerals } from 'WorldState/Minerals';
import { Office } from 'Office/Office';
import { RoomPlanData } from 'WorldState/RoomPlans';
import { Sources } from 'WorldState/Sources';
import { Structures } from 'WorldState/Structures';
import { TerritoryFranchisePlan } from './TerritoryFranchise';
import profiler from 'screeps-profiler';

export class RoomArchitect extends BoardroomManager {
    structureCount: Record<string, number> = {};

    plan() {
        let start = Game.cpu.getUsed();
        if (Game.cpu.bucket < 500) return; // Don't do room planning at low bucket levels
        for (let room of RoomData.all()) {
            if (Game.cpu.getUsed() - start <= 5) {
                this.generateRoomPlans(room);
                this.generateLogisticsRoutes(room);
            }

            if (room.territoryOf || this.boardroom.offices.has(room.name)) {
                const structures = Structures.byRoom(room.name).length;
                if (this.structureCount[room.name] !== structures) {
                    this.structureCount[room.name] = structures;
                    this.surveyRoomPlans(room);
                    this.surveyLogisticsRoutes(room);
                }
            }
        }
    }

    surveyRoomPlans(room: CachedRoom) {
        let plans = RoomPlanData.byRoom(room.name) ?? {results: {}};
        if (plans.office) {
            plans.office.extensions.blockPlan.survey();
            plans.office.headquarters.blockPlan.survey();
            plans.office.franchise1.blockPlan.survey();
            plans.office.franchise2.blockPlan.survey();
            plans.office.mine.blockPlan.survey();
        }
        if (plans.territory) {
            plans.territory.franchise1.blockPlan.survey();
            plans.territory.franchise2?.blockPlan.survey();
        }
        RoomPlanData.set(room.name, plans);
    }

    surveyLogisticsRoutes(room: CachedRoom) {
        let plans = LogisticsRouteData.byRoom(room.name) ?? {};
        if (plans.office) {
            plans.office.extensionsAndSpawns.destinations.forEach(s => s.survey());
            plans.office.towers.destinations.forEach(s => s.survey());
        }
        LogisticsRouteData.set(room.name, plans);
    }

    generateRoomPlans(room: CachedRoom) {
        let plans = RoomPlanData.byRoom(room.name) ?? {results: {}};

        if (plans?.results.office &&
            !(room.territoryOf || plans?.results.territory)
        ) return;

        if (room.territoryOf && !plans.results.territory) {
            const office = this.boardroom.offices.get(room.territoryOf);
            if (office) {
                try {
                    plans.territory = this.planTerritory(room, office);
                    plans.results.territory = 'SUCCESS';
                } catch (e) {
                    plans.results.territory = e.message;
                }
            }
        }

        if (!plans.results.office) {
            if (this.isEligible(room)) {
                try {
                    plans.office = this.planOffice(room);
                    plans.results.office = 'SUCCESS';
                } catch (e) {
                    plans.results.office = e.message;
                }
            } else {
                plans.results.office = 'FAILED - Room is ineligible for an office'
            }
        }

        RoomPlanData.set(room.name, plans);
    }

    generateLogisticsRoutes(room: CachedRoom) {
        let plans = RoomPlanData.byRoom(room.name);
        if (!plans) return;
        let routes = LogisticsRouteData.byRoom(room.name) ?? {};

        if (room.territoryOf && plans.territory && !routes.territory) {
            let office = RoomPlanData.byRoom(room.territoryOf);
            if (office?.office) {
                routes.territory = {
                    sources: generateTerritorySourceRoute(office.office.headquarters, plans.territory.franchise1, plans.territory.franchise2)
                }
            }
        }

        if (plans.office && !routes.office) {
            let sourcesRoute = generateSourceRoute(
                plans.office.franchise1,
                plans.office.franchise2,
                plans.office.mine,
                plans.office.headquarters
            );
            let towersRoute = generateTowersRoute(plans.office.headquarters);
            let extensionsAndSpawnsRoute = generateExtensionsRoute(
                plans.office.franchise1,
                plans.office.franchise2,
                plans.office.headquarters,
                plans.office.extensions
            );
            let controllerRoute = generateControllerRoute(plans.office.headquarters);
            routes.office = {
                sources: sourcesRoute,
                towers: towersRoute,
                extensionsAndSpawns: extensionsAndSpawnsRoute,
                controller: controllerRoute
            };
        }

        LogisticsRouteData.set(room.name, routes);
    }

    isEligible(room: CachedRoom) {
        // Room must have a controller and two sources
        // To avoid edge cases, controller and sources must not be within range 5 of each other
        let controller = Controllers.byRoom(room.name);
        if (!controller) {
            console.log(`Room planning for ${room.name} failed - No controller`);
            return false;
        }
        let sources = Sources.byRoom(room.name);
        if (!sources || sources.length < 2) {
            console.log(`Room planning for ${room.name} failed - Invalid number of sources`);
            return false;
        }

        let [source1, source2] = sources;
        if (controller.pos.getRangeTo(source1.pos) < 5) {
            console.log(`Room planning for ${room.name} failed - Source too close to controller`);
            return false;
        }
        if (controller.pos.getRangeTo(source2.pos) < 5) {
            console.log(`Room planning for ${room.name} failed - Source too close to controller`);
            return false;
        }
        if (source1.pos.getRangeTo(source2.pos) < 5) {
            console.log(`Room planning for ${room.name} failed - Sources too close together`);
            return false;
        }

        const terrainTypeCount = MapAnalyst.countTerrainTypes(room.name);

        if ((terrainTypeCount.swamp * 1.5) > terrainTypeCount.plains) {
            console.log(`Room planning for ${room.name} failed - Too much swamp`);
            return false;
        }
        return true;
    }

    reloadPlan(roomPlan: string) {
        let plan = new BlockPlan();
        plan.deserialize(roomPlan);
        return plan;
    }

    planTerritory(room: CachedRoom, office: Office) {
        let start = Game.cpu.getUsed();

        // Get sources
        let sources = Sources.byRoom(room.name);
        let headquarters = RoomPlanData.byRoom(office.name)?.office?.headquarters
        if (!headquarters) {
            throw new Error('FAILED generating territory - no office headquarters found')
        }
        let storage = headquarters.storage.pos

        // Calculate FranchisePlans
        let franchise1, franchise2;
        try {
            let franchises = sources
                .sort((a, b) => MapAnalyst.getRangeTo(a.pos, storage!) - MapAnalyst.getRangeTo(b.pos, storage!))
                .map(source => new TerritoryFranchisePlan().plan(source, storage!));

            [franchise1, franchise2] = franchises;
        } catch (e) {
            throw new Error('FAILED generating franchises: ' + e.message)
        }

        let end = Game.cpu.getUsed();
        console.log(`Planned Territory room ${room.name} with ${end - start} CPU`);
        return {
            franchise1,
            franchise2,
        }
    }

    planOffice(room: CachedRoom) {
        let start = Game.cpu.getUsed();

        // Get sources
        let sources = Sources.byRoom(room.name);
        let mineral = Minerals.byRoom(room.name);
        let controller = Controllers.byRoom(room.name);
        // Calculate FranchisePlans
        let franchise1, franchise2, mine, headquarters, extensions;
        try {
            let plans = sources
                .sort((a, b) => a.pos.getRangeTo(controller!.pos) - b.pos.getRangeTo(controller!.pos))
                .map(source => new FranchisePlan().plan(source));
            if (plans.length !== 2) throw new Error(`Unexpected number of sources: ${plans.length}`);
            [franchise1, franchise2] = plans;
        } catch (e) {
            throw new Error('FAILED generating franchises: ' + e.message);
        }
        try {
            if (!mineral) throw new Error(`No mineral found in room`)
            mine = new MinePlan().plan(mineral)
        } catch (e) {
            throw new Error('FAILED generating mine: ' + e.message)
        }
        try {
            headquarters = new HeadquartersPlan().plan(room.name);
        } catch (e) {
            throw new Error('FAILED generating headquarters: ' + e.message)
        }
        // Fill in remaining extensions

        try {
            extensions = new ExtensionsPlan().plan(room.name, franchise1, franchise2, mine, headquarters);
        } catch (e) {
            throw new Error('FAILED generating extensions: ' + e.message)
        }

        let end = Game.cpu.getUsed();
        console.log(`Planned Office room ${room.name} with ${end - start} CPU`);

        return {
            franchise1,
            franchise2,
            mine,
            headquarters,
            extensions,
        }
    }

    cleanup() {
        if (global.v.planning.state) {
            RoomData.all().forEach(room => {
                let plan = RoomPlanData.byRoom(room.name)
                if (plan?.territory && room.territoryOf) {
                    plan.territory.franchise1.blockPlan.visualize();
                    plan.territory.franchise2?.blockPlan.visualize();
                } else if (plan?.office && !room.territoryOf) {
                    plan.office.headquarters.blockPlan.visualize();
                    plan.office.franchise1.blockPlan.visualize();
                    plan.office.franchise2.blockPlan.visualize();
                    plan.office.mine.blockPlan.visualize();
                    plan.office.extensions.blockPlan.visualize();
                }
            })
        }
    }
}
profiler.registerClass(RoomArchitect, 'RoomArchitect');
