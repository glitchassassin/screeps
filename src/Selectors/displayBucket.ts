import { heapMetrics } from 'Metrics/heapMetrics';
import { Dashboard, Dial, Metrics } from 'screeps-viz';

export const displayBucket = () => {
  Dashboard({
    widgets: [
      {
        pos: { x: 44, y: 46 },
        width: 6,
        height: 4,
        widget: Dial({
          data: {
            value: Game.cpu.bucket / 10000
          },
          config: {
            label: Game.cpu.bucket.toString(),
            textStyle: { font: '0.7' },
            foregroundStyle: { stroke: '#44ff44' }
          }
        })
      }
    ]
  });
};

export const displaySpawn = () => {
  for (const office in Memory.offices) {
    if (!heapMetrics[office]?.spawnEfficiency) continue;
    const spawnEfficiency = Metrics.avg(heapMetrics[office].spawnEfficiency);
    Dashboard({
      widgets: [
        {
          pos: { x: 32, y: 46 },
          width: 6,
          height: 4,
          widget: Dial({
            data: {
              value: spawnEfficiency
            },
            config: {
              label: `${(spawnEfficiency * 100).toFixed(0)}%`,
              textStyle: { font: '0.7' },
              foregroundStyle: { stroke: '#ffff44' }
            }
          })
        }
      ],
      config: { room: office }
    });
  }
};

export const displayGcl = () => {
  Dashboard({
    widgets: [
      {
        pos: { x: 38, y: 46 },
        width: 6,
        height: 4,
        widget: Dial({
          data: {
            value: Game.gcl.progress / Game.gcl.progressTotal
          },
          config: {
            label: Game.gcl.level.toFixed(),
            textStyle: { font: '1' },
            foregroundStyle: { stroke: '#00ffff' }
          }
        })
      }
    ]
  });
};
