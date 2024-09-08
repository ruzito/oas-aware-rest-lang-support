import test from "node:test";
import assert from "node:assert/strict";

import { add } from "../build/asm_dbg.js";

test("asm unit test 1", () => {
    assert.strictEqual(add(1, 2), 3);
})
