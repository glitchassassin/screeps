import { Dashboard, Rectangle, Table } from "screeps-viz";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";

export default () => {
    for (const room in Memory.offices ?? []) {
        let estimatedCPU = 0;
        let estimatedEnergy = 0;
        let actualCPU = 0;
        let actualEnergy = 0;
        let table = [];
        for (let o of [...Memory.offices[room].pendingMissions, ...Memory.offices[room].activeMissions]) {
            table.push([
                o.type,
                o.priority,
                o.status,
                o.startTime ?? '---',
                `${o.actual.cpu.toFixed(2)}/${o.estimate.cpu.toFixed(2)}`,
                `${o.actual.energy}/${o.estimate.energy}`,
            ])
            estimatedCPU += o.estimate.cpu;
            estimatedEnergy += o.estimate.energy;
            actualCPU += o.actual.cpu;
            actualEnergy += o.actual.energy;
        }
        table.push(['---', '---', '---', '---', '---', '---'])
        table.push([
            'Totals',
            '',
            '',
            '',
            `${actualCPU.toFixed(2)}/${estimatedCPU.toFixed(2)}`,
            `${actualEnergy}/${estimatedEnergy}`,
        ])
        table.push([
            'Available',
            '',
            '',
            '',
            (Game.cpu.bucket / Object.keys(Memory.offices).length).toFixed(2),
            storageEnergyAvailable(room),
        ])
        Dashboard({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 40,
                    height: Math.min(48, table.length * 2),
                    widget: Rectangle({ data: Table({
                        config: { headers: ['Mission', 'Priority', 'Status', 'Start Time', 'CPU', 'Energy'] },
                        data: table
                    }) })
                }
            ],
            config: { room }
        })
    }
}
