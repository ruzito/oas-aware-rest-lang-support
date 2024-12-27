import { OasContext } from "./types";
import { PlainObject } from "./utils";

export type ObjectSchemaObject = {
  type: "object";
  properties: { [key: string]: SchemaObject };
};
export type ArraySchemaObject = { type: "array"; items: SchemaObject[] };
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
  if (oasParts.length !== httpParts.length)
    return { matches: false, parameters: {} };

  let parameters: PlainObject = {};
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

export function findSchema(
  method: string,
  httpPath: string,
  ctx: OasContext
): SchemaObject | undefined {
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

export function isReference(obj: SchemaObject): boolean {
  return "$ref" in obj;
}

export function isObject(obj: SchemaObject): boolean {
  return "type" in obj && obj.type === "object";
}

export function isArray(obj: SchemaObject): boolean {
  return "type" in obj && obj.type === "array";
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
  return unrollOne(resolveRef(ref, ctx), ctx);
}

export function resolveRef(ref: string, ctx: OasContext): any {
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
      doc = (doc as any)[seg];
    }
  }
  return doc;
}
