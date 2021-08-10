import AcquireReport from "Reports/AcquireReport";
import FacilitiesReport from "Reports/FacilitiesReport";
import FranchiseReport from "Reports/FranchiseReport";
import MilestonesReport from "Reports/MilestonesReport";
import RoomPlanningReport from "Reports/RoomPlanningReport";
import profiler from "utils/profiler";
import ObjectivesReport from "./ObjectivesReport";
import TerritoriesReport from "./TerritoriesReport";

declare global {
    namespace NodeJS {
        interface Global {
            d: (key: string) => void
        }
    }
}

const allReports: Record<string, CallableFunction> = {};

let activeReport = '';

export const register = (key: string, runner: CallableFunction) => {
    allReports[key] = runner;
}

export const run = profiler.registerFN(() => {
    allReports[activeReport]?.();
}, 'runReports')

global.d = (key: string) => {
    activeReport = key;
    if (!(key in allReports)) {
        console.log('Reports: ', Object.keys(allReports));
    }
}

register('franchises', FranchiseReport);
register('planning', RoomPlanningReport);
register('facilities', FacilitiesReport);
register('acquire', AcquireReport);
register('milestones', MilestonesReport);
register('territories', TerritoriesReport);
register('objectives', ObjectivesReport);
