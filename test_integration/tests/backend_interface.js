import {describe, test, before} from "node:test";
import assert from "node:assert/strict";

import * as wasm from "@local/oas-ls-backend-asm-script";
import * as vanilla from "@local/oas-ls-backend-vanilla";

let impls = [
    {name: "vanilla", impl: vanilla},
    {name: "wasm", impl: wasm},
]


async function setOAS(oas) {
    for (let impl of impls) {
        await impl.impl.loadOAS(oas)
    }
}

async function compare(name, foo) {
    test(name, async () => {
        let rets = await Promise.all(impls.map(async (impl) => {
            return {impl: impl.name, result: await foo(impl.impl)}
        }))
        for (let ret in rets) {
            if (ret == 0) {continue}
            assert.deepStrictEqual(rets[0].result, rets[ret].result)
        }
    })
}

for (let impl of impls) {
    describe(`${impl.name} backend`, () => {
        let be = impl.impl
        test("exports only needed", () => {
            assert.deepStrictEqual(Object.keys(be).sort(), ['CompletionType', 'HintType', 'loadOAS', 'requestCompletions', 'requestDocs', 'requestHints'].sort())
        })
        describe("exports enum", () => {
            test("CompletionType", () => {
                assert.deepStrictEqual(be.CompletionType, {DUMMY_TYPE: "dummyType"})
            })
            test("HintType", () => {
                assert.deepStrictEqual(be.HintType, {ERROR: 'error', WARNING: 'warning', INFO: 'info'})
            })
        })
        describe("exports async", () => {
            test("loadOAS", async () => {
                assert.strictEqual(typeof be.loadOAS, "function")
                let prom = be.loadOAS("")
                assert(prom instanceof Promise)
                let ret = await prom
                assert.strictEqual(ret, undefined)
            })
            
            test("requestDocs", async () => {
                assert.strictEqual(typeof be.requestDocs, "function")
                let prom = be.requestDocs("", 0)
                assert(prom instanceof Promise)
                let ret = await prom
                assert.strictEqual(typeof ret, "string")
            })
            
            test("requestCompletions", async () => {
                assert.strictEqual(typeof be.requestCompletions, "function")
                let prom = be.requestCompletions("", 0)
                assert(prom instanceof Promise)
                let ret = await prom
                assert(Array.isArray(ret))
            })
            
            test("requestHints", async () => {
                assert.strictEqual(typeof be.requestHints, "function")
                let prom = be.requestHints("")
                assert(prom instanceof Promise)
                let ret = await prom
                assert(Array.isArray(ret))
            })
        })
    })
}

describe("compare backends", () => {
    before(async () => { return await setOAS("") })
    describe("empty", async () => {
        compare("requestDocs", async (be) => {
            await be.requestDocs("", 0)
        })
        compare("requestCompletions", async (be) => {
            await be.requestCompletions("", 0)
        })
        compare("requestHints", async (be) => {
            await be.requestHints("", 0)
        })
    })
})