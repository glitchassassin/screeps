import { Bar, Grid, Rectangle } from "screeps-viz"

import { Office } from "Office/Office"
import { SpawnStrategist } from "Office/OfficeManagers/Strategists/SpawnStrategist"

const minionTypeWidget = (minionType: string, target: number, actual: number) => {
    return Bar({
        data: {
            value: actual,
            maxValue: target
        },
        config: {
            label: minionType
        }
    })
}

export default (office: Office) => Rectangle({ data: Grid(() => {
    const spawnStrategist = office.managers.get('SpawnStrategist') as SpawnStrategist;
    const spawnTargets = spawnStrategist.spawnTargets();
    const employees = spawnStrategist.getEmployees();
    return {
        data: Object.keys(spawnTargets).map(minionType =>
            minionTypeWidget(minionType, spawnTargets[minionType], employees[minionType] ?? 0)
        ),
        config: {
            columns: 7,
            rows: 1
        }
    }
}) })
