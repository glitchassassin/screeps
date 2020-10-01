import { Type } from "class-transformer";

export enum SwitchState {
    ON = 'ON',
    CONCISE = 'CONCISE',
    OFF = 'OFF',
}
export class Switch {
    state = SwitchState.OFF;
    on() { this.state = SwitchState.ON; }
    off() { this.state = SwitchState.OFF; }
    concise() { this.state = SwitchState.CONCISE; }
}
export class VisualizationController {
    roads = new Switch();
    franchises = new Switch();
    controller = new Switch();
    sales = new Switch();
    hr = new Switch();
    task = new Switch();
}
