import { parse as parseYAML } from "yaml";

import * as util from "./utils.js";
import { OasContext, OasSpec, JPathBody, HttpData } from "./types.js";

export enum OASFormat {
  YAML = "YAML",
  JSON = "JSON",
}

export function initOasContext(): OasContext {
  return {
    root: null,
    externalRefs: {},
  };
}

async function parseOAS(spec: string, format: OASFormat): Promise<OasSpec> {
  let pojo: util.PlainObject = {};
  let tryList = [(x: string) => JSON.parse(x), (x: string) => parseYAML(x)];
  if (format === OASFormat.YAML) {
    tryList = [parseYAML, JSON.parse];
  }
  let success = false;
  for (let parser of tryList) {
    try {
      pojo = parser(spec);
      success = true;
      break;
    } catch {}
  }
  if (success == false || !util.isPlainObject(pojo)) {
    console.warn("Could not parse specification", spec);
    return null;
  }
  return pojo;
}

async function fetchOAS(url: string, ctx: OasContext): Promise<OasSpec | null> {
  if (url in ctx.externalRefs) {
    return ctx.externalRefs[url];
  }
  ctx.externalRefs[url] = null;
  let contentType: string | null = null;
  let spec: string;

  // fetch spec
  try {
    let response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `Could not fetch OAS (status ${response.status}) from \`${url}\``
      );
      return null;
    }
    contentType = response.headers.get("content-type");
    spec = await response.text();
    if (spec === null) {
      console.warn(`Could not fetch OAS (empty body) from \`${url}\``);
      return null;
    }
  } catch (err) {
    console.warn(`Could not fetch OAS (unkown error) from \`${url}\`\n${err}`);
    return null;
  }

  // Guess format
  let format = OASFormat.JSON;
  if (
    typeof contentType === "string" &&
    (contentType.includes("yml") || contentType.includes("yaml"))
  ) {
    format = OASFormat.YAML;
  }

  // parse to json
  let pojo = await parseOAS(spec, format);
  ctx.externalRefs[url] = pojo;

  // recurse through ref URLs
  await dereferenceURLs(pojo, ctx);
  return pojo;
}

async function dereferenceURLs(pojoOAS: OasSpec, ctx: OasContext) {
  await util.traverseAsync(
    pojoOAS,
    async (path: util.Path, url: util.Scalar) => {
      if (path[path.length - 1] !== "$ref") return;
      if (typeof url !== "string") return;
      if (!url.startsWith("http://") && !url.startsWith("https://")) return;
      url = url.split("#")[0];
      if (url in ctx.externalRefs) return;

      let pojo = await fetchOAS(url, ctx);
      ctx.externalRefs[url] = pojo;
    }
  );
}

export async function loadOAS(
  oas: string,
  format: OASFormat = OASFormat.JSON,
  ctx: OasContext
): Promise<void> {
  const pojo = await parseOAS(oas, format);
  await dereferenceURLs(pojo, ctx);
  ctx.root = pojo;
  if (ctx.root === null) {
    throw new Error(`Could not parse OAS specification\n${oas}`);
  }
  console.log("Loaded OasContext", { ctx });
}

export async function loadURL(url: string, ctx: OasContext): Promise<void> {
  const root = await fetchOAS(url, ctx);
  ctx.root = root;
  if (ctx.root === null) {
    throw new Error(`Could not fetch OAS specification \`${url}\``);
  }
  console.log("Loaded OasContext from URL", { ctx });
}

export function ready(ctx: OasContext): boolean {
  return ctx.root !== null;
}

export function getRoot(ctx: OasContext): OasSpec {
  return ctx.root;
}

export function getRemote(url: string, ctx: OasContext): OasSpec | null {
  if (url in ctx.externalRefs) {
    return ctx.externalRefs[url];
  } else {
    return null;
  }
}

function resolveRef(ref: string, ctx: OasContext): any {
  const [urlPart, hashPart] = ref.split("#");
  let doc = ctx.root;

  // If there's a non-internal URL part, use external refs
  if (urlPart) {
    doc = ctx.externalRefs[urlPart];
    if (!doc) throw new Error("External reference not found: " + urlPart);
  }

  // If there's a hash part, treat it as a JSON pointer
  if (hashPart) {
    const segments = hashPart.replace(/^\/+/, "").split("/");
    for (const seg of segments) {
      if (doc == null) return undefined;
      doc = doc[seg];
    }
  }
  return doc;
}

type ObjectSchemaObject = {
  type: "object";
  properties: { [key: string]: SchemaObject };
};
type ArraySchemaObject = { type: "array"; items: SchemaObject[] };
type PrimitiveSchemaObject = { type: string };
type AllOfSchemaObject = { allOf: SchemaObject[] };
type ReferenceSchemaObject = { $ref: string };
type SchemaObject =
  ObjectSchemaObject
  | ArraySchemaObject
  | PrimitiveSchemaObject
  | AllOfSchemaObject
  | ReferenceSchemaObject;

function isReference(obj: SchemaObject): boolean {
  return "$ref" in obj
}

function isObject(obj: SchemaObject): boolean {
  return "type" in obj && obj.type === "object"
}

function isArray(obj: SchemaObject): boolean {
  return "type" in obj && obj.type === "array"
}

function isAllOf(obj: SchemaObject): boolean {
  return "allOf" in obj
}

function isAnyOf(obj: SchemaObject): boolean {
  return "anyOf" in obj
}

function isOneOf(obj: SchemaObject): boolean {
  return "oneOf" in obj
}

function isPrimitive(obj: SchemaObject): boolean {
  return "type" in obj && obj.type !== "object" && obj.type !== "array"
}

function unrollOne(obj: SchemaObject, ctx: OasContext): SchemaObject[] {
  if (isReference(obj)) {
    return followReference((obj as ReferenceSchemaObject).$ref, ctx);
  }
  if (isAllOf(obj)) {
    return (obj as AllOfSchemaObject).allOf;
  }
  if (isAnyOf(obj)) {
    return (obj as any).anyOf;
  }
  if (isOneOf(obj)) {
    return (obj as any).oneOf;
  }
  return [obj]
}

function followKey(objs: SchemaObject[], key: string|number, ctx: OasContext) : SchemaObject[] {
  // console.log("followKey", objs, key);
  return objs.flatMap((obj): SchemaObject[] => {
    if (isReference(obj)) {
      // console.log("followKey ref");
      return followKey(followReference((obj as ReferenceSchemaObject).$ref, ctx), key, ctx);
    }
    else if (isObject(obj)) {
      // console.log("followKey object");
      if (typeof key === "number") {
        // console.log("followKey object[number]");
        return [];
      }
      const o = obj as ObjectSchemaObject;
      if (key in o.properties) {
        // console.log("followKey object[string]");
        return [o.properties[key]];
      }
      else {
        // console.log("followKey object[string] not found");
        return [];
      }
    }
    else if (isArray(obj)) {
      // console.log("followKey array");
      if (typeof key === "string") {
        // console.log("followKey array[string]");
        return [];
      }
      const a = obj as ArraySchemaObject;
      if (key < a.items.length) {
        // console.log("followKey array[number]");
        return [a.items[key]];
      }
      else {
        // console.log("followKey array[number] not found");
        return [];
      }
    }
    else if (isAllOf(obj)) {
      const allof = obj as AllOfSchemaObject;
      // console.log("followKey allof");
      return followKey(allof.allOf, key, ctx);
    }
    else if (isPrimitive(obj)) {
      // console.log("followKey primitive");
      return [];
    }
    else if (isAnyOf(obj)) {
      const allof = obj as any;
      // console.log("followKey anyof");
      return followKey(allof.anyOf, key, ctx);
    }
    else if (isOneOf(obj)) {
      const allof = obj as any;
      // console.log("followKey oneof");
      return followKey(allof.oneOf, key, ctx);
    }
    // console.log("followKey unknown");
    return [];
  })
}

function followReference(ref: string, ctx: OasContext): SchemaObject[] {
  return unrollOne(resolveRef(ref, ctx), ctx);
}

export function oasFollowPath(
  path: JPathBody,
  httpData: HttpData,
  ctx: OasContext
): any {
  // console.log("- oasFollowPath", path, httpData, ctx);
  if (!ctx.root) {
    console.warn("No OAS loaded");
    return undefined;
  }

  const { method, path: httpPath } = httpData;

  // 1. Find the matching operation in OAS
  const schema = findSchema(method, httpPath, ctx);
  if (!schema) {
    console.warn("No schema found for", method, httpPath);
    return undefined;
  }

  let current = unrollOne(schema as SchemaObject, ctx);
  for (let i = 0; i < path.length; i++) {
    if (path[i] === undefined) {
      console.warn("Path is undefined at", i);
      return [];
    }
    let p = path[i] as number|string;
    current = followKey(current, p, ctx);
  }

  return current;
}

type OasKeySpecRaw = {
  name: string,
  schema: SchemaObject,
}
function getObjectKeysRaw(arr: SchemaObject[], ctx: OasContext): OasKeySpecRaw[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  let keys: OasKeySpecRaw[] = [];
  for (const obj of arr) {
    if (isObject(obj)) {
      const props = (obj as ObjectSchemaObject).properties;
      for (const key in props) {
        keys.push({ name: key, schema: props[key] });
      }
    }
    else if (isReference(obj)) {
      keys.push(...getObjectKeysRaw(followReference((obj as ReferenceSchemaObject).$ref, ctx), ctx));
    }
    else if (isArray(obj)) {
      // keys.push(...getObjectKeysRaw((obj as ArraySchemaObject).items, ctx));
    }
    else if (isAllOf(obj)) {
      keys.push(...getObjectKeysRaw((obj as AllOfSchemaObject).allOf, ctx));
    }
    else if (isAnyOf(obj)) {
      keys.push(...getObjectKeysRaw((obj as any).anyOf, ctx));
    }
    else if (isOneOf(obj)) {
      keys.push(...getObjectKeysRaw((obj as any).oneOf, ctx));
    }
    else if (isPrimitive(obj)) {
      // do nothing
    }
    else {
      // do nothing
    }
  }
  return keys;
}


export type OasKeySpec = {
  name: string,
  schemas: SchemaObject[],
}
export function getObjectKeys(arr: SchemaObject[], ctx: OasContext): OasKeySpec[] {
  return getObjectKeysRaw(arr, ctx).map((o) => {
    return { name: o.name, schemas: unrollOne(o.schema, ctx) };
  });
}

function findSchema(method: string, httpPath: string, ctx: OasContext): SchemaObject | undefined {
  const oas = ctx.root;
  if (!oas || !oas.paths) return undefined;

  const m = method.toLowerCase();

  // Try direct match first (if the user provided a path that directly matches)
  if (oas.paths[httpPath] && oas.paths[httpPath][m]) {
    return oas.paths[httpPath][m].requestBody?.content?.["application/json"]
      ?.schema;
  }

  // Try parameterized match
  for (const candidatePath of Object.keys(oas.paths)) {
    const { matches, parameters } = matchPath(candidatePath, httpPath);
    if (matches) {
      const op =
        oas.paths[candidatePath][m].requestBody?.content?.["application/json"]
          ?.schema;
      if (op) return op;
    }
  }

  return undefined;
}

function matchPath(
  oasPath: string,
  httpPath: string
): { matches: boolean; parameters: util.PlainObject } {
  const oasParts = oasPath.split("/");
  const httpParts = httpPath.split("/");
  if (oasParts.length !== httpParts.length)
    return { matches: false, parameters: {} };

  let parameters: util.PlainObject = {};
  for (let i = 0; i < oasParts.length; i++) {
    const op = oasParts[i];
    const hp = httpParts[i];
    if (op.startsWith("{")) {
      parameters[op.slice(1, -1)] = hp;
    } else if (op !== hp) {
      return { matches: false, parameters: {} };
    }
  }
  return { matches: true, parameters };
}
