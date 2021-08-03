import AcquireReport from "./AcquireReport";
import FranchiseReport from "./FranchiseReport";
import MilestonesReport from "./MilestonesReport";
import RoomPlanningReport from "./RoomPlanningReport";
import SpawnReport from "./SpawnReport";
import facilitiesReport from "./facilitiesReport";

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

export const run = () => {
    allReports[activeReport]?.();
}

global.d = (key: string) => {
    activeReport = key;
    if (!(key in allReports)) {
        console.log('Reports: ', Object.keys(allReports));
    }
}

register('franchises', FranchiseReport);
register('planning', RoomPlanningReport);
register('facilities', facilitiesReport);
register('spawn', SpawnReport);
register('acquire', AcquireReport);
register('milestones', MilestonesReport);
