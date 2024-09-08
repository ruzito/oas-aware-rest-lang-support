export function ultimate_answer(): Number {
    return 42;
}

declare global {
    var cb: Function;
}

export function register_callback(fn: Function): void {
    globalThis.cb = fn;
}

export function _wasm_call_callback(): Number {
    return globalThis.cb()
}