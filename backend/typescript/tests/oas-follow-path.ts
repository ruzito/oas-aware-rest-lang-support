import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"
import util from "node:util"
import {
  initOasContext,
  loadOas,
  oasFollowPath,
  getObjectKeys,
  OASFormat
} from "../oas-wrapper.js";

const logFile = fs.createWriteStream('console-output.oas-follow-path.log', { flags: 'w' });
const originalConsoleLog = console.log
global.console.log = function (...args: any[]) {
  logFile.write(util.format(...args) + '\n');
  // originalConsoleLog(...args)
};

function assertAreOasObjectOptions(arr: any) {
  assert(Array.isArray(arr), "Should be an array, got: " + JSON.stringify(arr));
  for (const obj of arr) {
    assert(obj);
    if (obj.$ref) {
      assert.deepEqual(Object.keys(obj), ["$ref"], "Should only have $ref, got: " + JSON.stringify(obj) + " in arr: " + JSON.stringify(arr));
    }
    else {
        assert(obj.type === "object", "Should be an OAS object, got: " + JSON.stringify(obj) + " in arr: " + JSON.stringify(arr));
    }
  }
}

const mockSpecTrivial = `
openapi: 3.0.0
paths:
  /users:
    post:
      description: postUsers
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
`;

const mockSpecSimple = `
openapi: 3.0.0
paths:
  /users:
    post:
      description: postUsers
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
`;

const mockSpecSimpleRec = `
openapi: 3.0.0
paths:
  /users:
    post:
      description: postUsers
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
        parent:
            $ref: '#/components/schemas/User'
`;

const mockSpecAllOf = `
openapi: 3.0.0
paths:
  /entities:
    post:
      description: postUsers
      requestBody:
        content:
          application/json:
            schema:
                allOf:
                  - $ref: '#/components/schemas/User'
                  - $ref: '#/components/schemas/Bot'
                  - type: object
                    properties:
                      name:
                        type: string
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
        parent:
            $ref: '#/components/schemas/User'
        servant:
            $ref: '#/components/schemas/Bot'
    Bot:
      type: object
      properties:
        callsign:
          type: string
        parent:
            $ref: '#/components/schemas/Bot'
        employer:
            $ref: '#/components/schemas/User'
`;

const mockSpecOneOf = `
openapi: 3.0.0
paths:
  /entities:
    post:
      description: postUsers
      requestBody:
        content:
          application/json:
            schema:
                oneOf:
                  - $ref: '#/components/schemas/User'
                  - $ref: '#/components/schemas/Bot'
                  - type: object
                    properties:
                      name:
                        type: string
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
        parent:
            $ref: '#/components/schemas/User'
        servant:
            $ref: '#/components/schemas/Bot'
    Bot:
      type: object
      properties:
        callsign:
          type: string
        parent:
            $ref: '#/components/schemas/Bot'
        employer:
            $ref: '#/components/schemas/User'
`;

const mockSpecAnyOf = `
openapi: 3.0.0
paths:
  /entities:
    post:
      description: postUsers
      requestBody:
        content:
          application/json:
            schema:
                anyOf:
                  - $ref: '#/components/schemas/User'
                  - $ref: '#/components/schemas/Bot'
                  - type: object
                    properties:
                      name:
                        type: string
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
        parent:
            $ref: '#/components/schemas/User'
        servant:
            $ref: '#/components/schemas/Bot'
    Bot:
      type: object
      properties:
        callsign:
          type: string
        parent:
            $ref: '#/components/schemas/Bot'
        employer:
            $ref: '#/components/schemas/User'
`;

function followTest(specObj: {[key: string]: string}, method: string, url: string, jpath: (string|number)[], expected: string[]) {
  for (const specname in specObj) {
    if (specObj.hasOwnProperty(specname)) {
      const spec = specObj[specname];
      const testName = `${specname} -- ${method}:${url} ${jpath.toString()} => ${expected.toString()}`;
      test(testName, async () => {
        console.log("\n\n=== Running test: ", testName);
        const ctx = initOasContext();
        console.log("=== Load OAS");
        await loadOas(spec, OASFormat.YAML, ctx);
        console.log("=== Follow Path");
        const result = oasFollowPath(
          jpath,
          { method: method, path: url, headers: [] },
          ctx
        );
        console.log("=== Assert OAS object array");
        assertAreOasObjectOptions(result);
        console.log("=== Get keys");
        const actualRawKeys = getObjectKeys(result, ctx);
        const actualKeys = actualRawKeys.map((o)=>o.name).sort();
        const expectedKeys = [...expected].sort();
        assert.deepEqual(actualKeys, expectedKeys, `expected: ${expected}, got: ${actualRawKeys}`);
        console.log("=== Test success\n\n");
      });

    }
  }
}

describe("OAS follow path and get keys", () => {
  followTest({mockSpecTrivial, mockSpecSimple}, "POST", "/users", [], ["name"]);

  followTest({mockSpecSimpleRec}, "POST", "/users", [], ["name", "parent"]);
  followTest({mockSpecSimpleRec}, "POST", "/users", ["parent"], ["name", "parent"]);
  followTest({mockSpecSimpleRec}, "POST", "/users", ["parent", "parent"], ["name", "parent"]);

  followTest({mockSpecAllOf, mockSpecAnyOf, mockSpecOneOf}, "POST", "/entities", [], ["name", "parent", "name", "parent", "servant", "callsign", "employer"]);
});