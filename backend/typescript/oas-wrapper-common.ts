import { Schema } from "yaml";
import { OasContext, OasSpec } from "./types";
import { PlainObject } from "./utils";

export type ObjectSchemaObject = {
  type: "object";
  properties: { [key: string]: SchemaObject };
};
export type ArraySchemaObject = { type: "array"; items: SchemaObject };
export type PrimitiveSchemaObject = { type: string };
export type AllOfSchemaObject = { allOf: SchemaObject[] };
export type ReferenceSchemaObject = { $ref: string };
export type SchemaObject =
  | ObjectSchemaObject
  | ArraySchemaObject
  | PrimitiveSchemaObject
  | AllOfSchemaObject
  | ReferenceSchemaObject;

function matchPath(
  oasPath: string,
  httpPath: string
): { matches: boolean; parameters: PlainObject } {
  const oasParts = oasPath.split("/");
  const httpParts = httpPath.split("/");
  if (oasParts.length !== httpParts.length) {
    // console.log("- Path lengths don't match", oasParts, httpParts);
    return { matches: false, parameters: {} };
  }

  let parameters: PlainObject = {};
  for (let i = 0; i < oasParts.length; i++) {
    const op = oasParts[i];
    const hp = httpParts[i];
    if (op.startsWith("{")) {
      parameters[op.slice(1, -1)] = hp;
    } else if (op !== hp) {
      // console.log("- Path parts don't match");
      return { matches: false, parameters: {} };
    }
  }
  return { matches: true, parameters };
}

export function getPaths(ctx: OasContext): string[] {
  const oas = ctx.root;
  if (!oas || !oas.paths) {
    console.warn("No paths in OAS");
    return [];
  }
  return Object.keys(oas.paths);
}

export function findPath(httpPath: string, ctx: OasContext) {
  const oas = ctx.root;
  if (!oas || !oas.paths) {
    console.warn("No paths in OAS");
    return undefined;
  }

  // Try direct match first (if the user provided a path that directly matches)
  if (oas.paths[httpPath]) {
    return oas.paths[httpPath]
  }

  // Try parameterized match
  for (const candidatePath of Object.keys(oas.paths)) {
    // console.log("Trying candidate path", candidatePath, httpPath);
    const { matches, parameters } = matchPath(candidatePath, httpPath);
    if (matches) {
      const op =
        oas.paths[candidatePath]
      if (op) return op;
    }
  }

  console.warn("No paths matched in OAS");
  return undefined;
}

export function findSchema(
  method: string,
  httpPath: string,
  ctx: OasContext
): SchemaObject | undefined {
  const m = method.toLowerCase();

  const p = findPath(httpPath, ctx);
  if (!p) {
    return undefined;
  }
  return p[m]?.requestBody?.content?.["application/json"]?.schema;
}

export function isReference(obj: SchemaObject): boolean {
  return "$ref" in obj;
}

export function isObject(obj: SchemaObject): boolean {
  return "type" in obj && obj.type === "object";
}

export function isArray(obj: SchemaObject): boolean {
  const hasTypeArray = "type" in obj && obj.type === "array";
  const hasItems = (!("type" in obj)) && "items" in obj;
  if (hasItems && !("type" in obj)) {
    console.warn("Array schema without type (schema has property `items` but no `type` property is specified):", {schemaObject: obj});
  }
  return hasTypeArray || hasItems;
}

export function isAllOf(obj: SchemaObject): boolean {
  return "allOf" in obj;
}

export function isAnyOf(obj: SchemaObject): boolean {
  return "anyOf" in obj;
}

export function isOneOf(obj: SchemaObject): boolean {
  return "oneOf" in obj;
}

export function isPrimitive(obj: SchemaObject): boolean {
  return "type" in obj && obj.type !== "object" && obj.type !== "array";
}

export function unrollOne(obj: SchemaObject, ctx: OasContext): SchemaObject[] {
  if (isReference(obj)) {
    return followReference((obj as ReferenceSchemaObject).$ref, ctx);
  }
  if (isAllOf(obj)) {
    return (obj as AllOfSchemaObject).allOf.flatMap((o) => unrollOne(o, ctx));
  }
  if (isAnyOf(obj)) {
    return (obj as any).anyOf.flatMap((o: any) =>
      unrollOne(o as SchemaObject, ctx)
    );
  }
  if (isOneOf(obj)) {
    return (obj as any).oneOf.flatMap((o: any) =>
      unrollOne(o as SchemaObject, ctx)
    );
  }
  return [obj];
}

export function followReference(ref: string, ctx: OasContext): SchemaObject[] {
  const res = resolveRef(ref, ctx) as (SchemaObject | null);
  if (res) {
    return unrollOne(resolveRef(ref, ctx) as SchemaObject, ctx);
  }
  return []
}

export function resolveRef(ref: string, ctx: OasContext): SchemaObject | null {
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
      if (doc == null) return null;
      doc = (doc as any)[seg];
    }
  }
  return doc as SchemaObject; // Lets assume that the reference is always to a schema object
}
