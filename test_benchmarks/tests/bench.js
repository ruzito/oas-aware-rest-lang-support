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

import { performance } from "node:perf_hooks";

// import * as fetch from "fetch";

const logFile = fs.createWriteStream("console-output.end-to-end.log", {
  flags: "w",
});
// const originalConsoleLog = console.log;
global.console.log = function (...args) {
//   logFile.write(util.format(Date.now(), "[INFO]", ...args) + "\n");
  // originalConsoleLog(...args)
};
// const originalConsoleWarn = console.warn;
global.console.warn = function (...args) {
//   logFile.write(util.format(Date.now(), "[WARN]", ...args) + "\n");
//   originalConsoleWarn(...args)
};
const originalConsoleErr = console.error;
global.console.error = function (...args) {
  logFile.write(util.format(Date.now(), "[WARN]", ...args) + "\n");
  originalConsoleErr(...args)
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

function generateLargeOas() {
    const paths = {};
    for (let i = 0; i < 10000; i++) {
        paths[`/endpoint-${i}`] = {
            get: {
                summary: `Get endpoint ${i}`,
                responses: {
                    200: { description: "OK" }
                }
            }
        };
    }
    return {
        openapi: "3.0.3",
        info: { title: "Massive Spec", version: "1.0.0" },
        paths
    };
}


async function dloas(url) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const response = await fetch(url);
  const oas = await response.text();
  return oas;
}

const results = {};
let evitaOas = null;


before(async () => {
  evitaOas = await dloas("https://demo.evitadb.io:5555/rest/evita");
  results.evitaSize = evitaOas.length;
});

describe("Benchmarks", () => {
  describe("evitaDB", () => {
    test("1000 parses, 1000 simple completions", async () => {
      let {text, offset} = curs(dedent(`
        POST /Brand/list HTTP/1.1
        Host: example.com
        Content-Type: application/json
        
        -----
        
        |
      `));
      let begin = performance.now();
      for (let i = 0; i < 100; i++) {
        let ctx = be.initOasContext();
        await be.parseOas(evitaOas, be.OasFormat.JSON, ctx);
        let completions = await be.requestCompletions(text, offset, ctx);
        assert.equal(completions.length, 1);
      }
      let end = performance.now();
      results.parseDuration = end - begin;
    });
    test("1 parse, 1000 hints, 1000 completions", async () => {
      let {text, offset} = curs(dedent(`
        POST /Product/query HTTP/1.1
        Host: example.com
        Content-Type: application/json

        -----

        {
        "filterBy": {
            "referenceTagsHaving": [
            {
                "and": [
                {
                    "and": [
                    {
                        "and": [
                        {
                            "entityHaving":{
                                |
                            }
                        }
                        ]
                    }
                    ]
                }
                ]
            }
            ]
        }
        }
      `));
      let ctx = be.initOasContext();
      await be.parseOas(evitaOas, be.OasFormat.JSON, ctx);
      let begin = performance.now();
      for (let i = 0; i < 40000; i++) {
        let hints = await be.requestHints(text, ctx);
        assert.equal(hints.length, 0);
        let completions = await be.requestCompletions(text, offset, ctx);
        assert.equal(completions.length, 74);
      }
      let end = performance.now();
      results.apiDuration = end - begin;
    });
  });
});

after(() => {
  console.error({results});
});