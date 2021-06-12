// Inspired by darrylhodgins/typescript-memoize
// Customized for Screeps

export function MemoizeByTick(autoHashOrHashFn?: boolean | ((...args: any[]) => any)) {
	return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {

		if (descriptor.value != null) {
			descriptor.value = getNewFunction(descriptor.value, autoHashOrHashFn);
		} else if (descriptor.get != null) {
			descriptor.get = getNewFunction(descriptor.get, autoHashOrHashFn);
		} else {
			throw 'Only put a Memoize() decorator on a method or get accessor.';
		}

	};
}

let counter = 0;
function getNewFunction(originalMethod: () => void, autoHashOrHashFn?: boolean | ((...args: any[]) => any), duration: number = 0) {
	const identifier = ++counter;

    let mapCleared = 0;

	// The function returned here gets called instead of originalMethod.
	return function (...args: any[]) {
		const propValName = `__memoized_value_${identifier}`;
		const propMapName = `__memoized_map_${identifier}`;

		let returnedValue: any;

		if (autoHashOrHashFn || args.length > 0 || duration > 0) {

			// Get or create map
            // @ts-ignore
			if (!this.hasOwnProperty(propMapName)) {
                // @ts-ignore
				Object.defineProperty(this, propMapName, {
					configurable: false,
					enumerable: false,
					writable: false,
					value: new Map<any, any>()
				});
                mapCleared = Game.time;
			}
            // @ts-ignore
			let myMap: Map<any, any> = this[propMapName];
            if (Game.time > mapCleared) {
                myMap.clear();
                mapCleared = Game.time;
            }

			let hashKey: any;

			// If true is passed as first parameter, will automatically use every argument, passed to string
			if (autoHashOrHashFn === true) {
				hashKey = args.map(a => a.toString()).join('!');
			} else if (autoHashOrHashFn) {
                // @ts-ignore
				hashKey = autoHashOrHashFn.apply(this, args);
			} else {
				hashKey = args[0];
			}

			const timestampKey = `${hashKey}__timestamp`;
			let isExpired: boolean = false;
			if (duration > 0) {
				if (!myMap.has(timestampKey)) {
					// "Expired" since it was never called before
					isExpired = true;
				} else {
					let timestamp = myMap.get(timestampKey);
					isExpired = (Date.now() - timestamp) > duration;
				}
			}

			if (myMap.has(hashKey) && !isExpired) {
				returnedValue = myMap.get(hashKey);
			} else {
                // @ts-ignore
				returnedValue = originalMethod.apply(this, args);
				myMap.set(hashKey, returnedValue);
				if (duration > 0) {
					myMap.set(timestampKey, Date.now());
				}
			}

		} else {

            // @ts-ignore
			if (this.hasOwnProperty(propValName)) {
                // @ts-ignore
				returnedValue = this[propValName];
			} else {
                // @ts-ignore
				returnedValue = originalMethod.apply(this, args);
                // @ts-ignore
				Object.defineProperty(this, propValName, {
					configurable: false,
					enumerable: false,
					writable: false,
					value: returnedValue
				});
			}
		}

		return returnedValue;
	};
}
