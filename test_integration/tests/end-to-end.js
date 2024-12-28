// start a lightweight static file server with oas specs
// load the oas context using the url
// test the completions and hints api

import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import * as be from "@local/oas-ls-backend";

import * as http from "http";

import * as fs from "fs";
import * as util from "util";
import { parse } from "url";

const logFile = fs.createWriteStream("console-output.end-to-end.log", {
  flags: "w",
});
const originalConsoleLog = console.log;
global.console.log = function (...args) {
  logFile.write(util.format(...args) + "\n");
  // originalConsoleLog(...args)
};
// const originalConsoleWarn = console.warn;
// global.console.warn = function (...args) {
//   logFile.write(util.format(...args) + "\n");
//   // originalConsoleLog(...args)
// };

const port = 5555;
// const ip = "localhost";
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

async function setOas(path) {
  let ctx = be.initOasContext();
  await be.fetchOas(`http://${ip}:${port}${path}`, ctx);
  return ctx;
}

describe("Test Server", () => {
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
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
  //   test("", async () => {});
});
