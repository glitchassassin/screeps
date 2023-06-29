export function dump<T>(value: T): T {
  // parse stack into a single line without line numbers
  const stackRegex = /at\s+([^\s]+)\s/i;
  const stack = new Error().stack?.split('\n').map(l => {
      const match = l.match(stackRegex);
      return match ? match[1].trim() : undefined;
    })
    .filter((l): l is string => !!l && !l.includes('dump'))
    .reverse();
  if (stack?.includes("Object.wrap")) {
    stack.splice(0, stack.indexOf("Object.wrap") + 1);
  }
  const context = stack?.join(' > ');

  // log stack and value
  console.log(context + "\n" + JSON.stringify(value, null, 2))

  return value;
}
