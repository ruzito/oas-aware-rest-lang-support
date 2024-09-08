// The entry file of your WebAssembly module.

import {vanilla_answer, vanilla_callback} from './bind_extern'

export function dummy_add(a: i32, b: i32): i32 {
    return a + b;
}

export function dummy_answer(): i32 {
    return vanilla_answer();
}
export function dummy_callback(): i32 {
    return vanilla_callback();
}
