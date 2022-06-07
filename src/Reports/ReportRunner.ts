import AcquireReport from "Reports/AcquireReport";
import FacilitiesReport from "Reports/FacilitiesReport";
import FranchiseReport from "Reports/FranchiseReport";
import MilestonesReport from "Reports/MilestonesReport";
import RoomPlanningReport from "Reports/RoomPlanningReport";
import profiler from "utils/profiler";
import BalanceReport from "./BalanceReport";
import BudgetReport from "./BudgetReport";
import LabsReport from "./LabsReport";
import MarketReport from "./MarketReport";
import ObjectivesReport from "./ObjectivesReport";
import OfficeReport from "./OfficeReport";
import TerminalsReport from "./TerminalsReport";
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
let reportOpts: any = undefined;

export const register = (key: string, runner: CallableFunction) => {
    allReports[key] = runner;
}

export const run = profiler.registerFN(() => {
    // const start = Game.cpu.getUsed();
    allReports[activeReport]?.(reportOpts);
    // console.log('Ran report', activeReport, 'with', Game.cpu.getUsed() - start, 'cpu')
}, 'runReports')

global.d = (key: string, opts?: any) => {
    activeReport = key;
    reportOpts = opts;
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
register('terminals', TerminalsReport);
register('balance', BalanceReport);
register('labs', LabsReport);
register('budget', BudgetReport);
register('market', MarketReport);
register('office', OfficeReport);

global.d('acquire')
