import { Dashboard, Label, Rectangle } from "screeps-viz";

import SpawnPressure from "./widgets/SpawnPressure";

export default () => {
    for (let office of global.boardroom.offices.values()) {
        Dashboard({
            config: { room: office.name, },
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 47,
                    height: 2,
                    widget: Rectangle({ data: Label({ data: 'Spawn Strategy Report' }) })
                },
                {
                    pos: { x: 1, y: 4 },
                    width: 47,
                    height: 10,
                    widget: SpawnPressure(office)
                },
            ],
        });
    }
}
