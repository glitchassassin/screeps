import { LogisticsRouteData } from "WorldState/LogisticsRoutes";
import { Route } from "WorldState/LogisticsRouteModel";

const drawRoute = (roomName: string, route: Route, stroke: string) => {
    new RoomVisual(roomName).poly([
        ...route.sources,
        ...route.destinations
    ].map(s => s.pos), { stroke })
}

export default () => {
    for (let office of global.boardroom.offices.keys()) {
        let routes = LogisticsRouteData.byRoom(office);

        if (routes?.office) {
            drawRoute(office, routes.office.controller, 'blue');
            drawRoute(office, routes.office.sources, 'yellow');
            drawRoute(office, routes.office.towers, 'red');
            drawRoute(office, routes.office.extensionsAndSpawns, 'magenta');
        }
    }
}
