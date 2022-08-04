import { viz } from 'Selectors/viz';

export function visualizeCostMatrix(cm: CostMatrix) {
  for (let x = 0; x < 100; x++) {
    for (let y = 0; y < 100; y++) {
      if (cm.get(x, y)) viz().text(cm.get(x, y).toString(), x, y, { font: '0.4' });
    }
  }
}
