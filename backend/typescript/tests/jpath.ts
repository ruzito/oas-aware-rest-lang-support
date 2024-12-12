import test from "node:test";
import assert from "node:assert/strict";
import { describe } from "node:test";
import fs from "node:fs"
import util from "node:util"

import * as rp from "../request-parser.js";

const assertEq: <T>(actual: unknown, expected: T, message?: string | Error) => asserts actual is T = assert.deepStrictEqual
const fail = (reason: string) => { throw new Error(reason) }

const logFile = fs.createWriteStream('console-output.log', { flags: 'w' });
const originalConsoleLog = console.log
global.console.log = function (...args: any[]) {
  logFile.write(util.format(...args) + '\n');
  originalConsoleLog(...args)
};

function curs(s: string, cursor = '|') {
    const offset = s.indexOf(cursor)
    const text = s.slice(0, offset) + s.slice(offset + 1);
    return {text, offset}
}

async function getJPath(s: string, cursor = '|') {
    const {text, offset} = curs(s, cursor)
    const httpPayload = '---\n'
    const parseResult = await rp.parse(httpPayload + text)
    if (parseResult === null) {
        fail(`Could not parse tested input \`${text}\``)
        return {path: null, tail: null} // unreachable just, wtf is typescript doing here, fail throws every single time, come on!!!
    }
    const {http, json, jsonBegin} = parseResult
    assertEq(jsonBegin, httpPayload.length)
    return await rp.getJPath(json, offset)
}

function testJPathVariant(s: string, expected: any) {
    test(s, async () => {
        console.log('\n\n\n\n', s, '\n')
        const result = await getJPath(s)
        const dbg = (result as any).debug
        let dbgMsg = "\n"
        for (let key in dbg) {
            let valMsg = dbg[key]
            if (Array.isArray(valMsg)) {
                valMsg = valMsg.toString()
            }
            else if (typeof(valMsg) === "object") {
                if ("tree" in valMsg) {
                    valMsg = `SyntaxNode(${valMsg.type}) : ${valMsg.id} -> ${valMsg.text}`
                }
            }
            dbgMsg += `[${key}]: ${valMsg}\n`
        }
        assertEq(result.path, expected.path, dbgMsg)
        assert(result.tail !== null)
        assertEq(result.tail.kind, expected.tail.kind, dbgMsg)
        assertEq(result.tail.hint, expected.tail.hint, dbgMsg)
        assertEq(result.tail.range, expected.tail.range, dbgMsg)
    })
}

function run(s: string, expected: any) {
    testJPathVariant(s, expected)
    testJPathVariant(`[[[${s}]]]`, {path: [0,0,0,...expected.path], tail: {kind: expected.tail.kind, hint: expected.tail.hint, range: {beginOffset: expected.tail.range.beginOffset+3, endOffset: expected.tail.range.endOffset+3}}})
    testJPathVariant(`[[{"hello": ${s}}]]`, {path: [0,0,'hello',...expected.path], tail: {kind: expected.tail.kind, hint: expected.tail.hint, range: {beginOffset: expected.tail.range.beginOffset+12, endOffset: expected.tail.range.endOffset+12}}})
}


describe("jpath", async () => {
    if (false) { // skip because: too much right now
        run(`{"|}`, {path: [], tail: {kind: 'objectKey'}})
    }

    run(`{|}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 1, endOffset: 1}}}
    )
    run(`{"key|": "value"}`,
        {path: [], tail: {kind: 'objectKey', hint: "key", range: {beginOffset: 1, endOffset: 6}}}
    )
    run(`{"key"|: "value"}`,
        {path: [], tail: {kind: 'objectKey', hint: "key", range: {beginOffset: 1, endOffset: 6}}}
    )
    run(`{"key":| "value"}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 15}}}
    )
    run(`{"key": | }`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 8}}}
    )
    run(`{"key": |}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 8}}}
    )
    run(`{"key": "val|ue"}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 15}}}
    )
    run(`{"key": "val|ue", "anotherKey": "anotherValue"}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 15}}}
    )
    run(`{"key": "value"|, "anotherKey": "anotherValue"}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 15}}}
        // {path: [], tail: {kind: 'objectKeyPrependComma', hint: "", range: {beginOffset: 15, endOffset: 15}}}
    )
    run(`{"key": "value"  |  , "anotherKey": "anotherValue"}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 15}}}
        // {path: [], tail: {kind: 'objectKeyPrependComma', hint: "", range: {beginOffset: 15, endOffset: 17}}}
    )
    run(`{"key": "value",| "anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 16, endOffset: 16}}}
    )
    run(`{"key": "value", | "anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 17, endOffset: 17}}}
    )
    run(`{"key": "value", |"anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "anotherKey", range: {beginOffset: 17, endOffset: 29}}}
    )
    run(`{"key": "value", "|anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "anotherKey", range: {beginOffset: 17, endOffset: 29}}}
    )
    run(`{"key": "value",|, "anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 16, endOffset: 16}}}
    )
    run(`{"key": "value",  |  , "anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 18, endOffset: 18}}}
    )
    run(`{"key": "value",| ,"anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 16, endOffset: 16}}}
    )
    run(`{"key": "value", |, "anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 17, endOffset: 17}}}
    )
    run(`{"key": "value", |,"anotherKey": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 17, endOffset: 17}}}
    )
    run(`{"key": "value", "anotherKey|": "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "anotherKey", range: {beginOffset: 17, endOffset: 29}}}
    )
    run(`{"key": "value", "anotherKey"|: "anotherValue"}`,
        {path: [], tail: {kind: 'objectKey', hint: "anotherKey", range: {beginOffset: 17, endOffset: 29}}}
    )
    run(`{"key": "value", "anotherKey":| "anotherValue"}`,
        {path: ['anotherKey'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 31, endOffset: 45}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue|"}`,
        {path: ['anotherKey'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 31, endOffset: 45}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue"|}`,
        {path: ['anotherKey'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 31, endOffset: 45}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue"|  }`,
        {path: ['anotherKey'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 31, endOffset: 45}}}
        // {path: [], tail: {kind: 'objectKeyPrependComma', hint: "", range: {beginOffset: 45, endOffset: 45}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue" |}`,
        {path: ['anotherKey'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 31, endOffset: 45}}}
        // {path: [], tail: {kind: 'objectKeyPrependComma', hint: "", range: {beginOffset: 45, endOffset: 45}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue"  |  }`,
        {path: ['anotherKey'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 31, endOffset: 45}}}
        // {path: [], tail: {kind: 'objectKeyPrependComma', hint: "", range: {beginOffset: 45, endOffset: 45}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue",|}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 46, endOffset: 46}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue",|  }`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 46, endOffset: 46}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue", |}`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 47, endOffset: 47}}}
    )
    run(`{"key": "value", "anotherKey": "anotherValue",  |  }`,
        {path: [], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 48, endOffset: 48}}}
    )
    run(`{"key":| , "anotherKey": "anotherValue"}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 7, endOffset: 7}}}
    )
    run(`{"key": |, "anotherKey": "anotherValue"}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 8}}}
    )
    run(`{"key": | , "anotherKey": "anotherValue"}`,
        {path: ['key'], tail: {kind: 'objectValue', hint: "TODO: Value hint", range: {beginOffset: 8, endOffset: 8}}}
    )
    run(`[|{"d": "x"}]`,
        {path: [], tail: {kind: 'arrayElement', hint: "TODO: Value hint", range: {beginOffset: 1, endOffset: 1}}}
    )
    run(`[{|"d": "x"}]`,
        {path: [0], tail: {kind: 'objectKey', hint: "d", range: {beginOffset: 2, endOffset: 5}}}
        // {path: [0], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 2, endOffset: 2}}}
    )
    run(`[{|   "d":  "x"}]`,
        {path: [0], tail: {kind: 'objectKey', hint: "d", range: {beginOffset: 5, endOffset: 8}}}
        // {path: [0], tail: {kind: 'objectKey', hint: "", range: {beginOffset: 2, endOffset: 2}}}
    )
})