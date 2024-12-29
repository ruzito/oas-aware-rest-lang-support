import { describe, test } from "node:test";
import assert from "node:assert/strict";

import * as be from "@local/oas-ls-backend";

describe(`backend`, () => {
    test("exports only needed", () => {
        assert.deepStrictEqual(Object.keys(be).sort(), ['CompletionType', 'HintType', 'fetchOas', 'parseOas', 'requestCompletions', 'requestDocs', 'requestHints', 'initOasContext'].sort())
    })
    describe("exports enum", () => {
        test("CompletionType", () => {
            assert.deepStrictEqual(be.CompletionType, {
                DUMMY_TYPE: "dummyType",
                OBJECT_KEY: "object_key",
                VALUE: "value",
                PATH: "path",
                METHOD: "method",
            })
        })
        test("HintType", () => {
            assert.deepStrictEqual(be.HintType, { ERROR: 'error', WARNING: 'warning', INFO: 'info' })
        })
    })

    describe("exports async", () => {
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

        test("fetchOas", async () => {
            assert.strictEqual(typeof be.fetchOas, "function")
            let prom = be.fetchOas("")
            assert(prom instanceof Promise)
            try {
                let ret = await prom
                assert.strictEqual(ret, undefined)
            }
            catch {/* loading an empty OAS is reasonable to fail as well */ }
        })
        test("parseOas", async () => {
            assert.strictEqual(typeof be.parseOas, "function")
            let prom = be.parseOas("")
            assert(prom instanceof Promise)
            try {
                let ret = await prom
                assert.strictEqual(ret, undefined)
            }
            catch {/* loading an empty OAS is reasonable to fail as well */ }
        })

        test("requestDocs", async () => {
            assert.strictEqual(typeof be.requestDocs, "function")
            let prom = be.requestDocs("", 0)
            assert(prom instanceof Promise)
            let ret = await prom
            assert.strictEqual(typeof ret, "string")
        })

        test("requestCompletions", async () => {
            assert.strictEqual(typeof be.requestCompletions, "function", "not a function")
            let prom = be.requestCompletions("", 0)
            assert(prom instanceof Promise, "not an async function")
            let ret = await prom
            assert(Array.isArray(ret), "does not return array")
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