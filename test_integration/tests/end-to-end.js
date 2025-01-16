// start a lightweight static file server with oas specs
// load the oas context using the url
// test the completions and hints api

import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import * as be from "@ruzito/oas-ls-backend";

import * as http from "http";

import * as fs from "fs";
import * as util from "util";
import { parse } from "url";

const logFile = fs.createWriteStream("console-output.end-to-end.log", {
  flags: "w",
});
// const originalConsoleLog = console.log;
global.console.log = function (...args) {
  logFile.write(util.format(Date.now(), "[INFO]", ...args) + "\n");
  // originalConsoleLog(...args)
};
// const originalConsoleWarn = console.warn;
global.console.warn = function (...args) {
  logFile.write(util.format(Date.now(), "[WARN]", ...args) + "\n");
  // originalConsoleWarn(...args)
};

const port = 5555;
const ip = "127.0.0.1";


let specs = {};

/**
 * Minimal server that:
 * - Returns "Hello from root" on `/`.
 * - Returns JSON data on `/api/data`.
 * - Returns 404 for any other path.
 */
const server = http.createServer((req, res) => {
  const parsedUrl = parse(req.url ?? "");
  const pathname = parsedUrl.pathname ?? "/";

  // Simple routing
  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello from root!");
    console.log(`200 OK: echo root`);
  } else if (specs[pathname]) {
    console.log(`preparing 200 OK: ${pathname}`);
    const someData = specs[pathname];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(someData));
    console.log(`200 OK: ${pathname}: ${res}`);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
    console.log(`404 Not Found: ${pathname}`);
  }
});

before(() => {
  server.listen(port, () => {
    console.log(`Server is running at http://${ip}:${port}/`);
    console.log(`Try http://${ip}:${port}/api/data for JSON`);
  });
});

beforeEach(() => {
  console.log();
  console.log("-------------------");
  console.log();
  specs = {};
});

after(() => {
  server.close();
});

function requestBody(spec) {
  return { content: { "application/json": { schema: spec } } };
}

function specObject(method, path, spec, schemas = {}) {
  return {
    openapi: "3.0.1",
    paths: { [path]: { [method.toLowerCase()]: spec } },
    components: { schemas: schemas },
  };
}

// A simple dedent function
function dedent(str) {
  // Remove the first and last newline to allow for nicer usage
  const lines = str.split("\n");
  let minIndent = Infinity;
  for (let line of lines) {
    // count indentation
    if (line.trim() !== "") {
      let indent = 0;
      while (line[indent] === " ") {
        indent++;
      }
      if (indent < minIndent) {
        minIndent = indent;
      }
    }
  }
  let newLines = [];
  for (let line of lines) {
    newLines.push(line.slice(minIndent));
  }
  while (newLines[0].trim() === "") {
    newLines.shift();
  }
  while (newLines[newLines.length - 1].trim() === "") {
    newLines.pop();
  }
  return newLines.join("\n");
}

function curs(s, cursor = '|') {
  const offset = s.indexOf(cursor)
  assert.equal(typeof offset, "number")
  const text = s.slice(0, offset) + s.slice(offset + 1);
  assert.equal(typeof text, "string")
  return {text, offset}
}

async function setOas(path) {
  let ctx = be.initOasContext();
  await be.fetchOas(`http://${ip}:${port}${path}`, ctx);
  return ctx;
}

describe("Test Server", () => {
  // Test for the test code :-D
  test("server running", async () => {
    const response = await fetch(`http://${ip}:${port}/`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "Hello from root!");
  });
  test("server some spec", async () => {
    let data = { some: "data" };
    specs["/spec"] = data;
    const response = await fetch(`http://${ip}:${port}/spec`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), data);
  });
  test("server empty spec", async () => {
    const response = await fetch(`http://${ip}:${port}/spec`);
    assert.equal(response.status, 404);
  });
});

describe("End-to-end tests", () => {
  describe("simple oas", () => {
    let ctx = null;
    let endpoint = "/users";
    let method = "POST";
    beforeEach(async () => {
      let apiLocation = "/api";
      specs[apiLocation] = specObject(
        method.toLowerCase(), // method
        endpoint, // path
        {
          // body
          requestBody: requestBody({
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
          }),
        }
      );
      ctx = await setOas(apiLocation);
    });
    test("0 errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "John",
          "age": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 0);
    });
    test("empty key error", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "": "John"
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 1);
    });
    test("1 key error", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "naame": "John",
          "age": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 1);
    });
    test("2 key errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "naame": "John",
          "aage": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 2);
    });
    test("duplicate key errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "John",
          "name": "Doe"
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 2);
    });
    test("primitive wrong value errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": 42,
          "age": "John"
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 2);
    });
    test("filled array wrong value error", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        [
          {
            "name": "John",
            "age": 42
          }
        ]
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 1);
    });
    test("empty array wrong value error", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        [
        ]
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 1);
    });
    test("filled object wrong value error", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": {
            "first": "John"
          }
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 1);
    });
    test("empty object wrong value error", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": {}
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 1);
    });
    test("value completions for \"name\": |", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": |
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"some string\"");
      assert.equal(comps[0].begin, offset);
      assert.equal(comps[0].end, offset);
    });
    test("value completions for \"age\": |", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "age": |
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "0");
      assert.equal(comps[0].begin, offset);
      assert.equal(comps[0].end, offset);
    });
    test("value completions for root object", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        |
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "{}");
      assert.equal(comps[0].begin, offset);
      assert.equal(comps[0].end, offset);
    });
    test("key completions for \"|\": {}", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "|": {}
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 2);
      assert.equal(comps[0].result, "\"age\"");
      assert.equal(comps[0].begin, offset - 1);
      assert.equal(comps[0].end, offset + 1);
      assert.equal(comps[1].result, "\"name\"");
    });
    test("key completions for \"n|\": {}", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "n|": {}
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset - 2);
      assert.equal(comps[0].end, offset + 1);
    });
    test("key completions for \"n|a\": {}", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "n|a": {}
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset - 2);
      assert.equal(comps[0].end, offset + 2);
    });
    test("key completions for \"|na\": {}", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "|na": {}
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset - 1);
      assert.equal(comps[0].end, offset + 3);
    });
    test("key completions for \"|\"", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "|"
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 2);
      assert.equal(comps[0].result, "\"age\"");
      assert.equal(comps[0].begin, offset - 1);
      assert.equal(comps[0].end, offset + 1);
      assert.equal(comps[1].result, "\"name\"");
    });
    test("key completions for \"n|\"", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "n|"
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset - 2);
      assert.equal(comps[0].end, offset + 1);
    });
    test("key completions for \"n|a\"", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "n|a"
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset - 2);
      assert.equal(comps[0].end, offset + 2);
    });
    test("key completions for \"|na\"", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "|na"
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset - 1);
      assert.equal(comps[0].end, offset + 3);
    });
    test("key completions for |", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          |
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 2);
      assert.equal(comps[0].result, "\"age\"");
      assert.equal(comps[1].result, "\"name\"");
      assert.equal(comps[0].begin, offset);
      assert.equal(comps[0].end, offset);
    });
    test("key completions for n|", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          n|
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset - 1);
      assert.equal(comps[0].end, offset);
    });
    test("key completions for n|a", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          n|a
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset - 1);
      assert.equal(comps[0].end, offset + 1);
    });
    test("key completions for |na", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          |na
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "\"name\"");
      assert.equal(comps[0].begin, offset);
      assert.equal(comps[0].end, offset + 2);
    });
  });
  describe("one layer same source ref", () => {
    let ctx = null;
    let endpoint = "/users";
    let method = "POST";
    beforeEach(async () => {
      let apiLocation = "/api";
      specs[apiLocation] = specObject(
        method.toLowerCase(), // method
        endpoint, // path
        {
          // body
          requestBody: requestBody({
            $ref: "#/components/schemas/User",
          }),
        },
        {
          // schemas
          User: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
          },
        }
      );
      ctx = await setOas(apiLocation);
    });
    test("0 errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "John",
          "age": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 0);
    });
    test("1 error", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "naame": "John",
          "age": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 1);
    });
    test("2 errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "naame": "John",
          "aage": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 2);
    });
  });
  describe("one layer another source ref", () => {
    let ctx = null;
    let endpoint = "/users";
    let method = "POST";
    beforeEach(async () => {
      let apiLocation = "/api";
      let schemaLocation = "/schema";
      specs[apiLocation] = specObject(
        method.toLowerCase(), // method
        endpoint, // path
        {
          // body
          requestBody: requestBody({
            $ref: `http://${ip}:${port}${schemaLocation}#/User`,
          }),
        }
      );
      specs[schemaLocation] = {
        // schemas
        User: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        },
      };
      ctx = await setOas(apiLocation);
    });
    test("0 errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "John",
          "age": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 0);
    });
    test("1 error", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "naame": "John",
          "age": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 1);
    });
    test("2 errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "naame": "John",
          "aage": 42
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 2);
    });
  });
  describe("recursive ref", () => {
    let ctx = null;
    let endpoint = "/users";
    let method = "POST";
    beforeEach(async () => {
      let apiLocation = "/api";
      specs[apiLocation] = specObject(
        method.toLowerCase(), // method
        endpoint, // path
        {
          // body
          requestBody: requestBody({
            $ref: `#/components/schemas/User`,
          }),
        },
        {
          // schemas
          User: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
              parent: { $ref: "#/components/schemas/User" },
              friends: { type: "array", items: { $ref: "#/components/schemas/User" } },

              // broken oas, but for the sake of this work
              // I assume that if type is missing and items is present,
              // it is an array
              enemies: { items: { $ref: "#/components/schemas/User" } },
            },
          },
        }
      );
      ctx = await setOas(apiLocation);
    });

    test("0 errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "Alice",
          "age": 20,
          "parent": {
            "name": "Judy",
            "age": 50
          },
          "friends": [
            {
              "name": "Bob",
              "age": 23
            }
          ],
          "enemies": [
            {
              "name": "Craig",
              "age": 30,
              "enemies": [
                {
                  "name": "Alice"
                },
                {
                  "name": "Bob"
                },
                {
                  "name": "Judy"
                }
              ]
            }
          ]
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 0);
    })

    test("wrong types", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "Alice",
          "age": "20",
          "parent": {
            "name": "Judy",
            "age": "50"
          },
          "friends": [
            {
              "name": "Bob",
              "age": "23"
            }
          ],
          "enemies": [
            {
              "name": "Craig",
              "age": "30",
              "enemies": [
                {
                  "name": 0
                },
                {
                  "name": 1
                },
                {
                  "name": 2
                }
              ]
            }
          ]
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 7);
    })

    test("too much keys", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "Alice",
          "age": 20,
          "hat": "white",
          "parent": {
            "name": "Judy",
            "age": 50,
            "hat": "red"
          },
          "friends": [
            {
              "name": "Bob",
              "age": 23,
              "hat": "gray"
            }
          ],
          "enemies": [
            {
              "name": "Craig",
              "age": 30,
              "hat": "black",
              "enemies": [
                {
                  "name": "Alice"
                },
                {
                  "name": "Bob"
                },
                {
                  "name": "Judy"
                }
              ]
            }
          ]
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 4);
    })

    test("value completions for nested object", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "Alice",
          "age": 20,
          "parent": |,
          "friends": [
            {
              "name": "Bob",
              "age": 23
            }
          ]
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "{}");
      assert.equal(comps[0].begin, offset);
      assert.equal(comps[0].end, offset);
    });
    test("value completions for nested array", async () => {
      let {text, offset} = curs(dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "name": "Alice",
          "age": 20,
          "parent": {
            "name": "Judy",
            "age": 50
          },
          "friends": |
        }
      `));
      let comps = await be.requestCompletions(text, offset, ctx);
      assert.equal(comps.length, 1);
      assert.equal(comps[0].result, "[]");
      assert.equal(comps[0].begin, offset);
      assert.equal(comps[0].end, offset);
    });
  });
  describe("allof/anyof/oneof", () => {
    let ctx = null;
    let endpoint = "/users";
    let method = "POST";
    beforeEach(async () => {
      let apiLocation = "/api";
      specs[apiLocation] = specObject(
        method.toLowerCase(), // method
        endpoint, // path
        {
          // body
          requestBody: requestBody({
            type: "object",
            properties: {
              allOf: {
                allOf: [
                  { $ref: "#/components/schemas/User" },
                  { $ref: "#/components/schemas/Employee" },
                  { $ref: "#/components/schemas/Roomba" },
                ]
              },
              anyOf: {
                anyOf: [
                  { $ref: "#/components/schemas/User" },
                  { $ref: "#/components/schemas/Employee" },
                  { $ref: "#/components/schemas/Roomba" },
                ]
              },
              oneOf: {
                oneOf: [
                  { $ref: "#/components/schemas/User" },
                  { $ref: "#/components/schemas/Employee" },
                  { $ref: "#/components/schemas/Roomba" },
                ]
              },
            },
          }),
        },
        {
          // schemas
          User: {
            type: "object",
            properties: {
              fingerprintCookie: { type: "string" },
              creditScore: { type: "number" },
            },
          },
          Employee: {
            type: "object",
            properties: {
              linesOfCodePerWeek: { type: "number" },
              salary: { type: "number" },
            },
          },
          Roomba: {
            type: "object",
            properties: {
              petName: { type: "string" },
              favouriteDock: { type: "string" },
              emojiBumperSticker: { type: "string" },
              nextMaintenanceScheduleTimestamp: { type: "number" },
            },
          },
        }
      );
      ctx = await setOas(apiLocation);
    });

    test("0 errors", async () => {
      let req = dedent(`
        POST ${endpoint} HTTP/1.1
        Content-Type: application/json
        ---
        {
          "allOf": {
            "fingerprintCookie": "abc",
            "creditScore": 800,
            "linesOfCodePerWeek": 1000,
            "salary": 100000,
            "petName": "R2D2",
            "favouriteDock": "kitchen",
            "emojiBumperSticker": "🤖",
            "nextMaintenanceScheduleTimestamp": 1630000000
          },
          "anyOf": {
            "fingerprintCookie": "abc",
            "creditScore": 800,
            "linesOfCodePerWeek": 1000,
            "salary": 100000,
            "petName": "R2D2",
            "favouriteDock": "kitchen",
            "emojiBumperSticker": "🤖",
            "nextMaintenanceScheduleTimestamp": 1630000000
          },
          "oneOf": {
            "fingerprintCookie": "abc",
            "creditScore": 800,
            "linesOfCodePerWeek": 1000,
            "salary": 100000,
            "petName": "R2D2",
            "favouriteDock": "kitchen",
            "emojiBumperSticker": "🤖",
            "nextMaintenanceScheduleTimestamp": 1630000000
          }
        }
      `);
      let hints = await be.requestHints(req, ctx);
      assert.equal(hints.length, 0);
    });
  });
});
