/**
 * This file generates optimal builds for Engineers (output to `builder.ts`)
 */

function test(workParts = 1, moveParts = 1, carryParts = 1, distance = 55, energyLimit = 100000, roads = false) {
  const workToBeDone = 10000000;
  const carryCapacity = carryParts * 50;
  const buildPower = workParts * 5;
  const trips = Math.ceil(workToBeDone / buildPower / carryCapacity);
  // move parts remove 2 fatigue
  // work parts generate 2 fatigue off roads, 1 fatigue on roads
  // full carry parts (1/2 time) generate 2 fatigue off roads, 1 fatigue on roads
  const speed = Math.min(1, (moveParts * 2) / ((roads ? 1 : 2) * (workParts + carryParts / 2)));
  const travelTime = ((distance * 2) / speed) * trips;
  const workTime = (carryCapacity / buildPower) * trips;

  const time = travelTime + workTime;
  const cost = workParts * 100 + moveParts * 50 + carryParts * 50;
  const costPerTick = cost / 1500;

  if (cost > energyLimit || workParts + moveParts + carryParts > 50) return;

  const description = `${workParts}W/${moveParts}M/${carryParts}C: ${time.toFixed(0)} * ${costPerTick.toFixed(2)}`;

  const metricVsCost = `${costPerTick * time}\t${cost}`;

  return [costPerTick * time, [workParts, moveParts, carryParts]];
}

function permutations(i, distance, energyLimit, roads) {
  results = [];
  for (let workParts = 1; workParts <= 50; workParts++) {
    for (let moveParts = 1; moveParts <= 50; moveParts++) {
      for (let carryParts = 1; carryParts <= 50; carryParts++) {
        const score = test(workParts, moveParts, carryParts, distance, energyLimit, roads);
        score && results.push(score);
      }
    }
  }
  return results.sort((a, b) => a[0] - b[0]);
}
console.log('export const builder = {');
for (const roads of [true, false]) {
  console.log(roads ? '  roads: {' : '  none: {');
  for (let distance = 10; distance <= 100; distance += 90) {
    console.log(distance === 10 ? '    near: [' : '    far: [');
    for (const energyLimit of [12900, 5600, 1800, 1300, 800, 550, 300]) {
      const results = permutations(50, distance, energyLimit, roads)[0][1];
      console.log(
        '      [',
        [
          ...new Array(results[0]).fill('WORK'),
          ...new Array(results[1]).fill('MOVE'),
          ...new Array(results[2]).fill('CARRY')
        ].join(', '),
        '],'
      );
    }
    console.log('    ],');
  }
  console.log('  },');
}
console.log('}');
