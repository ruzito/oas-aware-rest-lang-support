// What should have been part of JavaScript/TypeScript from the beginning

export type PlainObject = { [key: string]: unknown }
export type Scalar = string | number | boolean | null | undefined
export type Path = Array<string | number>

export function isPlainObject(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) {
        return false
    }

    let proto = Object.getPrototypeOf(obj)

    if (proto === null) {
        return true
    }

    return proto === Object.prototype
}

export function traverse(
    obj: unknown,
    leafCb: (path: Path, value: Scalar | PlainObject | Array<any>) => void,
    shouldNestObjectPred: (path: Path, parentObject: PlainObject) => boolean = () => true,
    shouldNestArrayPred: (path: Path, parentArray: Array<any>) => boolean = () => true,
): void {
    function recurse(obj: unknown, path: Path) {
        if (Array.isArray(obj)) {
            // console.log("traversing array", path)
            if (obj.length === 0) {
                leafCb(path, obj as Array<any>)
            }
            for (const i of obj.keys()) {
                if (shouldNestArrayPred(path.concat(i), obj)) {
                    recurse(obj[i], path.concat(i));
                }
            }
        } else if (typeof obj === 'object' && obj !== null) {
            // console.log("traversing object", path)
            const castObj: PlainObject = obj as PlainObject
            let empty = true
            for (const key in obj) {
                empty = false
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    if (shouldNestObjectPred(path.concat(key), castObj)) {
                        
                        recurse(castObj[key], path.concat(key));
                    }
                }
            }
            if (empty) {
                leafCb(path, obj as PlainObject)
            }
        }
        else {
            leafCb(path, obj as Scalar)
        }
    }
    recurse(obj, [])
}

export async function traverseAsync(
    obj: unknown,
    callback: (path: Path, value: Scalar) => Promise<void>
): Promise<void> {
    async function recurse(obj: unknown, path: Path) {
        if (Array.isArray(obj) && obj !== null) {
            for (const i of obj.keys()) {
                await recurse(obj[i], path.concat(i));
            }
        } else if (typeof obj === 'object' && obj !== null) {
            const castObj: PlainObject = obj as PlainObject
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    await recurse(castObj[key], path.concat(key));
                }
            }
        }
        else {
            await callback(path, obj as Scalar)
        }
    }
    await recurse(obj, [])
}

export function accessByPath(obj: any, path: Path): any {
    return path.reduce((accumulator, key) => {
        if (accumulator !== null && accumulator !== undefined) {
            return accumulator[key]
        }
        return undefined
    }, obj)
}

export function exposeDebug(pairs: PlainObject) {
    let global_ : any = typeof window !== "undefined" ? window : global;
    global_.debug = global_.debug || {};
    for (let key in pairs) {
        global_.debug[key] = pairs[key];
    }
}

export function* reversed<T>(it: Iterable<T> | Array<T>): Generator<T> {
    let arr = null
    if (Array.isArray(it)) {
        arr = it
    }
    else {
        arr = Array.from(it)
    }
    for (let i = arr.length - 1; i >= 0; i--) {
        yield arr[i];
    }
}

export function reduce<T, U>(iterable: Iterable<T>, reducer: (accumulator: U, current: T) => U, initialValue: U): U {
    let accumulator = initialValue;
    for (const value of iterable) {
        accumulator = reducer(accumulator, value);
    }
    return accumulator;
}