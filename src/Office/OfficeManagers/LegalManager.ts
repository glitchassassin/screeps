import { OfficeTaskManager } from "./OfficeTaskManager";
import { Table } from "Visualizations/Table";
import { lazyMap } from "utils/lazyIterators";

export class LegalManager extends OfficeTaskManager {
    minionTypes = ['PARALEGAL', 'LAWYER'];
    run() {
        super.run()
        if (global.v.legal.state) { this.report(); }
    }
    report() {
        super.report();
        let controllers = lazyMap(
            global.worldState.controllers.byOffice.get(this.office.name) ?? [],
            controller => [
                controller.pos.roomName,
                controller.owner ?? controller.reservationOwner ?? '',
                controller.reservationDuration ?? ''
            ])
        let controllerTable = [
            ['Controller', 'Owner', 'Reserved'],
            ...controllers
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), controllerTable);
    }
}
