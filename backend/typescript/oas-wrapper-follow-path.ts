import {
  AllOfSchemaObject,
  ArraySchemaObject,
  findSchema,
  followReference,
  isAllOf,
  isAnyOf,
  isArray,
  isObject,
  isOneOf,
  isPrimitive,
  isReference,
  ObjectSchemaObject,
  ReferenceSchemaObject,
  SchemaObject,
  unrollOne,
} from "./oas-wrapper-common";
import { HttpData, JPathBody, OasContext } from "./types";

function followKey(
  objs: SchemaObject[],
  key: string | number,
  ctx: OasContext
): SchemaObject[] {
  // console.log("followKey", objs, key);
  return objs.flatMap((obj): SchemaObject[] => {
    if (isReference(obj)) {
      // console.log("followKey ref");
      return followKey(
        followReference((obj as ReferenceSchemaObject).$ref, ctx),
        key,
        ctx
      );
    } else if (isObject(obj)) {
      // console.log("followKey object");
      if (typeof key === "number") {
        // console.log("followKey object[number]");
        return [];
      }
      const o = obj as ObjectSchemaObject;
      if (key in o.properties) {
        // console.log("followKey object[string]");
        return [o.properties[key]];
      } else {
        // console.log("followKey object[string] not found");
        return [];
      }
    } else if (isArray(obj)) {
      // console.log("followKey array");
      if (typeof key === "string") {
        // console.log("followKey array[string]");
        return [];
      }
      const a = obj as ArraySchemaObject;
      // console.log("followKey array[number]");
      return [a.items];
    } else if (isAllOf(obj)) {
      const allof = obj as AllOfSchemaObject;
      // console.log("followKey allof");
      return followKey(allof.allOf, key, ctx);
    } else if (isPrimitive(obj)) {
      // console.log("followKey primitive");
      return [];
    } else if (isAnyOf(obj)) {
      const allof = obj as any;
      // console.log("followKey anyof");
      return followKey(allof.anyOf, key, ctx);
    } else if (isOneOf(obj)) {
      const allof = obj as any;
      // console.log("followKey oneof");
      return followKey(allof.oneOf, key, ctx);
    }
    // console.log("followKey unknown");
    return [];
  });
}

export function oasFollowPathInit(
  httpData: HttpData,
  ctx: OasContext
): SchemaObject[] {
  // console.log("- oasFollowPath", path, httpData, ctx);
  if (!ctx.root) {
    console.warn("No OAS loaded");
    return [];
  }

  const { method, path: httpPath } = httpData;

  // 1. Find the matching operation in OAS
  const schema = findSchema(method, httpPath, ctx);
  if (!schema) {
    console.warn("No schema found for", method, httpPath);
    return [];
  }

  let current = unrollOne(schema as SchemaObject, ctx);
  return current;
}

export function oasFollowPathFrom(
  path: JPathBody,
  begin: SchemaObject[],
  ctx: OasContext
): SchemaObject[] {
  let current = begin;
  for (let p of path) {
    if (current.length === 0) {
      return [];
    }
    if (p === undefined) {
      console.warn("Path contains undefined");
      return [];
    }
    current = followKey(current, p, ctx);
  }
  return current;
}

export function oasFollowPath(
  path: JPathBody,
  httpData: HttpData,
  ctx: OasContext
): SchemaObject[] {
  let current = oasFollowPathInit(httpData, ctx);
  return oasFollowPathFrom(path, current, ctx);
}

type OasKeySpecRaw = {
  name: string,
  schema: SchemaObject,
};
function getObjectKeysRaw(
  arr: SchemaObject[],
  ctx: OasContext
): OasKeySpecRaw[] {
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
    } else if (isReference(obj)) {
      keys.push(
        ...getObjectKeysRaw(
          followReference((obj as ReferenceSchemaObject).$ref, ctx),
          ctx
        )
      );
    } else if (isArray(obj)) {
      // keys.push(...getObjectKeysRaw((obj as ArraySchemaObject).items, ctx));
    } else if (isAllOf(obj)) {
      keys.push(...getObjectKeysRaw((obj as AllOfSchemaObject).allOf, ctx));
    } else if (isAnyOf(obj)) {
      keys.push(...getObjectKeysRaw((obj as any).anyOf, ctx));
    } else if (isOneOf(obj)) {
      keys.push(...getObjectKeysRaw((obj as any).oneOf, ctx));
    } else if (isPrimitive(obj)) {
      // do nothing
    } else {
      // do nothing
    }
  }
  return keys;
}

export type OasKeySpec = {
  name: string;
  schemas: SchemaObject[];
};
export function getObjectKeys(
  arr: SchemaObject[],
  ctx: OasContext
): OasKeySpec[] {
  return getObjectKeysRaw(arr, ctx).map((o) => {
    return { name: o.name, schemas: unrollOne(o.schema, ctx) };
  });
}

type OasValueSpecRaw = {
  name: string,
  schema: SchemaObject,
};
export function getObjectType(
  arr: SchemaObject[],
  ctx: OasContext
): OasValueSpecRaw[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  let types: OasValueSpecRaw[] = [];
  for (const obj of arr) {
    if (isObject(obj)) {
      types.push({ name: "object", schema: obj });
    } else if (isReference(obj)) {
      types.push(
        ...getObjectType(
          followReference((obj as ReferenceSchemaObject).$ref, ctx),
          ctx
        )
      );
    } else if (isArray(obj)) {
      types.push({name: "array", schema: obj});
    } else if (isAllOf(obj)) {
      types.push(...getObjectType((obj as AllOfSchemaObject).allOf, ctx));
    } else if (isAnyOf(obj)) {
      types.push(...getObjectType((obj as any).anyOf, ctx));
    } else if (isOneOf(obj)) {
      types.push(...getObjectType((obj as any).oneOf, ctx));
    } else if (isPrimitive(obj)) {
      types.push({ name: (obj as any).type, schema: obj });
    } else {
      // do nothing
    }
  }
  return types;
}

