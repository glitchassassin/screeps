export const logCostMatrix = (cm: CostMatrix) => {
    for (let y = 0; y < 49; y++) {
        let line = '';
        for (let x = 0; x < 49; x++) {
            line += (cm.get(x, y) + '   ').slice(0, 3);
        }
        console.log(line);
    }
}
