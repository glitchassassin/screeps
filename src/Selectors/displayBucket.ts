import { Dashboard, Dial } from "screeps-viz";

export const displayBucket = () => {
  Dashboard({
    widgets: [{
      pos: { x: 44, y: 46},
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
    }]
  })
}

export const displayGcl = () => {
  Dashboard({
    widgets: [{
      pos: { x: 38, y: 46},
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
    }]
  })
}
