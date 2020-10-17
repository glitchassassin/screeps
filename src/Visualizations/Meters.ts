

export class Bar {
    public max: number;
    constructor(
        public label: string,
        public style: PolyStyle,
        public value: number,
        max: number|null = null
    ) {
        this.max = max ?? this.value ?? 0;
        if (isNaN(this.max)) this.max = 0;
        if (isNaN(this.value)) this.value = 0;
    }
    render(pos: RoomPosition, width: number, height: number, chartMaxValue: number|null = null) {
        let vis = new RoomVisual(pos.roomName);

        let maxHeight = height - 2.5;
        let effectiveMax = Math.max(chartMaxValue ?? this.max, this.value);
        let valueHeight = (this.value / effectiveMax) * maxHeight;
        let maxValueHeight = (this.max / effectiveMax) * maxHeight;

        // Draw labels
        let center = pos.x + width / 2;
        vis.text(this.label, center, pos.y + height - 1);
        vis.text(effectiveMax.toFixed(0), center, pos.y);
        vis.text(this.value.toFixed(0), center, pos.y + height - 2.5);

        // Draw bar, scaled
        vis.rect(pos.x, pos.y + 0.5 + (maxHeight - maxValueHeight), width, maxValueHeight, {...this.style, strokeWidth: 0.1, fill: 'transparent'});
        vis.rect(pos.x, pos.y + 0.5 + (maxHeight - valueHeight), width, valueHeight, {...this.style, stroke: 'transparent',});
    }
}

export class Meters {
    height = 10;
    constructor(
        public bars: Bar[]
    ) { }

    render(pos: RoomPosition, flatten = true) {
        if (this.bars.length === 0) return; // Nothing to render
        let vis = new RoomVisual(pos.roomName);

        // Calculate column width for labels
        let columnWidth = Math.ceil(this.bars.reduce((max, bar) => Math.max(max, (bar.label.length * 0.4)), 0));
        let chartMax = this.bars.reduce((max, bar) => Math.max(max, Math.max(bar.max, bar.value)), 0);

        let boxWidth = 1 + (columnWidth + 1) * this.bars.length;
        // Draw rect
        vis.rect(pos.x, pos.y, boxWidth, this.height + 2, {
            fill: 'rgba(0,0,0,0.3)',
            stroke: 'rgba(255,255,255,0.3)'
        })

        this.bars.forEach((bar, index) => {
            let xOffset = pos.x + 1 + (columnWidth * index) + index;
            bar.render(new RoomPosition(xOffset, pos.y + 1, pos.roomName), columnWidth, this.height, flatten ? null : chartMax);
        })
    }
}
