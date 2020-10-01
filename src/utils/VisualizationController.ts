export class Switch {
    state = false;
    on() { this.state = true; }
    off() { this.state = false; }
    toggle() { this.state = !this.state; }
}

const mapSwitches = ['roads', 'franchises', 'controller', 'construction'] as const;
type mapSwitchTypes = ('none'|'all'|typeof mapSwitches[number]);

const reportsSwitches = ['sales', 'hr', 'task'] as const;
type reportsSwitchTypes = ('none'|typeof reportsSwitches[number]);

export class VisualizationController {
    roads = new Switch();
    franchises = new Switch();
    controller = new Switch();
    construction = new Switch();

    sales = new Switch();
    hr = new Switch();
    task = new Switch();

    map = new Proxy({}, {
        get: (target, name: mapSwitchTypes, receiver) => {
            if (name === 'none') {
                mapSwitches.forEach(m => this[m].off());
            } else if (name === 'all') {
                mapSwitches.forEach(m => this[m].on());
            } else if (mapSwitches.includes(name)) {
                console.log(name);
                this[name].toggle();
            } else {
                return () => `[none, all, ${mapSwitches.join(', ')}]`
            }
            return;
        }
    })
    reports = new Proxy({}, {
        get: (target, name: reportsSwitchTypes, receiver) => {
            if (name === 'none') {
                reportsSwitches.forEach(m => this[m].off());
            } else if (reportsSwitches.includes(name)) {
                reportsSwitches.forEach(m => this[m].off());
                this[name].on();
            } else {
                return () => `[none, ${reportsSwitches.join(', ')}]`
            }
            return;
        }
    })

    toString() {
        return '[map, reports]'
    }
}
