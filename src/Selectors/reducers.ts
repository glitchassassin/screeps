export const sum = (a: number, b: number) => a + b;
export const min =
  <T>(value: (v: T) => number) =>
  (a?: T, b?: T) => {
    if (!a && b) return b;
    if (!b && a) return a;
    if (!a || !b) return undefined;
    if (value(b) < value(a)) return b;
    return a;
  };
