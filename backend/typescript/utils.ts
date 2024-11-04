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
    callback: (path: Path, value: Scalar) => void
): void {
    function recurse(obj: unknown, path: Path) {
        if (Array.isArray(obj)) {
            for (const i of obj.keys()) {
                recurse(obj[i], path.concat(i));
            }
        } else if (typeof obj === 'object' && obj !== null) {
            const castObj: PlainObject = obj as PlainObject
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    recurse(castObj[key], path.concat(key));
                }
            }
        }
        else {
            callback(path, obj as Scalar)
        }
    }
    recurse(obj, [])
}

export async function traverseAsync(
    obj: unknown,
    callback: (path: Path, value: Scalar) => Promise<void>
): Promise<void> {
    async function recurse(obj: unknown, path: Path) {
        if (Array.isArray(obj)) {
            for (const i of obj.keys()) {
                recurse(obj[i], path.concat(i));
            }
        } else if (typeof obj === 'object' && obj !== null) {
            const castObj: PlainObject = obj as PlainObject
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    recurse(castObj[key], path.concat(key));
                }
            }
        }
        else {
            await callback(path, obj as Scalar)
        }
    }
    recurse(obj, [])
}

export function accessByPath(obj: any, path: Path): any {
    return path.reduce((accumulator, key) => {
        if (accumulator !== null && accumulator !== undefined) {
            return accumulator[key]
        }
        return undefined
    }, obj)
}