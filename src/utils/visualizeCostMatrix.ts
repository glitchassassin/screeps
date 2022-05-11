export function visualizeCostMatrix(cm: CostMatrix) {
    const viz = new RoomVisual();

    for (let x = 0; x < 100; x++) {
        for (let y = 0; y < 100; y++) {
            if (cm.get(x, y)) viz.text(cm.get(x, y).toString(), x, y, { font: '0.4' });
        }
    }
}
