import test from "node:test";
import assert from "node:assert/strict";

import * as util from "../build/utils.js";

const assertEq = assert.deepStrictEqual
const fail = (reason) => { throw new Error(reason) }

function stub(expected, outOfOrder = false) {
    const matched = new Array(expected.length).fill(false);
    let callCount = 0
    let lastCallCount = 0

    function stub_(...args) {
        let foundMatch = false;
        if (expected.length === 0) {
            fail("Stub should not have been called")
        }

        function assertArgsAt(index) {
            assertEq(
                args,
                expected[index],
                `Expected arguments ${JSON.stringify(expected[index])}, but got ${JSON.stringify(args)}`
            );
            matched[index] = true;
            foundMatch = true;
        }

        if (outOfOrder) {
            for (let i = 0; i < expected.length; i++) {
                if (!matched[i]) {
                    try {
                        assertArgsAt(i)
                        break; // Stop checking after finding a match
                    } catch (e) {
                        // Continue checking other expected arguments
                    }
                }
            }
        }
        else {
            assertArgsAt(callCount)
        }

        if (!foundMatch) {
            fail(`Unexpected call with arguments: ${JSON.stringify(args)}`);
        }

        callCount++
    }
    stub_.resetCounter = function () {
        lastCallCount = callCount
    }
    stub_.verify = function (cnt) {
        const callsSinceReset = callCount - lastCallCount;
        assertEq(callsSinceReset, cnt, `Unexpected number of calls on the stub. Expected: ${cnt}, Got: ${callsSinceReset}`)
        stub_.resetCounter()
    }
    stub_.verifyDone = function () {
        for (let i = 0; i < expected.length; i++) {
            if (!matched[i]) {
                fail(`Expected call \`${i}\` with arguments ${JSON.stringify(expected[i])} was not made`);
            }
        }
    }
    return stub_
}

test("traverse non object", () => {
    let cb = stub([
        [[], null],
        [[], undefined],
        [[], 0],
        [[], 42],
        [[], ""],
        [[], "63"],
        [[], "hello"],
        [[], false],
        [[], true],
    ])
    util.traverse(null, cb); cb.verify(1)
    util.traverse(undefined, cb); cb.verify(1)
    util.traverse(0, cb); cb.verify(1)
    util.traverse(42, cb); cb.verify(1)
    util.traverse("", cb); cb.verify(1)
    util.traverse("63", cb); cb.verify(1)
    util.traverse("hello", cb); cb.verify(1)
    util.traverse(false, cb); cb.verify(1)
    util.traverse(true, cb); cb.verify(1)
    cb.verifyDone()
})

test("traverse empty object", () => {
    let cb = stub([]) // fail on call
    util.traverse({}, cb)
    util.traverse([], cb)
})

test("traverse simple object", () => {
    let cb = stub([
        [["null"], null],
        [["undefined"], undefined],
        [["0"], 0],
        [["42"], 42],
        [["emptyString"], ""],
        [["63"], "63"],
        [["hello"], "hello"],
        [["false"], false],
        [["true"], true],
    ], true)
    util.traverse({
        "null": null,
        "undefined": undefined,
        "0": 0,
        "42": 42,
        "emptyString": "",
        "63": "63",
        "hello": "hello",
        "false": false,
        "true": true,
    }, cb)
    cb.verifyDone()
})

const nestedPojo = {
    "null": null,
    "arr": [
        { "undefined": undefined },
        0
    ],
    "nested": {
        "42": 42,
        "nested": {
            "emptyString": "",
            "nested": {
                "63": "63",
                "nested": {
                    "hello": "hello",
                    "nested": {
                        "false": false,
                        "nested": {
                            "true": true,
                        }
                    }
                }
            }
        }
    },
}

test("traverse nested object", () => {
    let cb = stub([
        [["null"], null],
        [["arr", 0, "undefined"], undefined],
        [["arr", 1], 0],
        [["nested", "42"], 42],
        [["nested", "nested", "emptyString"], ""],
        [["nested", "nested", "nested", "63"], "63"],
        [["nested", "nested", "nested", "nested", "hello"], "hello"],
        [["nested", "nested", "nested", "nested", "nested", "false"], false],
        [["nested", "nested", "nested", "nested", "nested", "nested", "true"], true],
    ], true)
    util.traverse(nestedPojo, cb)
    cb.verifyDone()
})

test("index nested object", () => {
    assertEq(
        util.accessByPath(nestedPojo, ["nested", "nested", "nested", "nested", "nested", "nested", "true"]),
        true
    )
})
