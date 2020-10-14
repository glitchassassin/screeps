let start = 0;
let current = 0;

export const resetDebugCPU = () => {
    start = Game.cpu.getUsed();
    current = start;
    console.log(` -=< Starting CPU debug >=-         [ 0.000 | 0.000 ]`)
}
export const debugCPU = (context: string) => {
    let previous = current;
    current = Game.cpu.getUsed();
    console.log(`${context.padEnd(35)} [ ${(current - previous).toFixed(3)} | ${(current - start).toFixed(3)} ]`)
}
