import { Dashboard, Rectangle, Table } from "screeps-viz";

export default () => {
    for (let room in Memory.offices) {
        const rclMilestones = Memory.rooms[room].rclMilestones;
        if (!rclMilestones) continue;
        const rclMilestonesTable = [];
        for (let i = 1; i <= 8; i++) {
            rclMilestonesTable.push([
                i,
                (rclMilestones[i] - (rclMilestones[i - 1] ?? rclMilestones[1])) ?? '',
                (rclMilestones[i] - rclMilestones[1]) ?? '',
            ])
        }

        const gclMilestones = Memory.stats.gclMilestones;
        if (!gclMilestones) continue;
        const gclMilestonesTable = [];
        for (let i = 1; i <= Object.keys(gclMilestones).length; i++) {
            gclMilestonesTable.push([
                i,
                (gclMilestones[i] - (gclMilestones[i - 1] ?? gclMilestones[1])) ?? '',
                (gclMilestones[i] - gclMilestones[1]) ?? '',
            ])
        }

        Dashboard({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 15,
                    height: 21,
                    widget: Rectangle({ data: Table({
                        config: { headers: ['Level', 'From Previous', 'From First'], label: 'GCL' },
                        data: gclMilestonesTable
                    }) })
                },
                {
                    pos: { x: 17, y: 1 },
                    width: 15,
                    height: 11,
                    widget: Rectangle({ data: Table({
                        config: { headers: ['Level', 'From Previous', 'From First'], label: 'RCL' },
                        data: rclMilestonesTable
                    }) })
                },
            ],
            config: { room }
        })
    }
}
