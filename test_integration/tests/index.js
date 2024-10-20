import {describe, test} from "node:test";
import assert from "node:assert/strict";

import * as wasm from "@local/oas-ls-backend-asm-script/bind_test";


describe("wasm bindings", () => {

    test("NPM client can calls WASM", () => {
        assert.strictEqual(wasm.dummy_add(1, 2), 3);
    })
    
    test("NPM client can call WASM calling TS", () => {
        assert.strictEqual(wasm.dummy_answer(), 42);
    })
    
    test("NPM client can register callbacks for wasm", () => {
        wasm.register_callback(() => { return 12; })
        assert.strictEqual(wasm.dummy_callback(), 12);
    })
})