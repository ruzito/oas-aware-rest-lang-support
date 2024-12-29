import { HttpData, OasContext, OasSpec } from "./types";
import { oasFollowPathFrom } from "./oas-wrapper-follow-path";
import {
  findSchema,
  isArray,
  isObject,
  SchemaObject,
  unrollOne
} from "./oas-wrapper-common";

import * as util from './utils'

import { Scalar, PlainObject } from "./utils";
import { Key } from "readline";

type KeyError = {
  type: "keyError",
  atPath: Array<string | number>,
  hint: string
}

type FormatError = {
  type: "formatError",
  atPath: Array<string | number>,
  hint: string,
  possibleTypes: string[]
}

type UrlError = {
  type: "urlError"
}

type Error = KeyError | FormatError | UrlError

const ARR = 0
const OBJ = 1
const validatePath = (determinant: 0|1, urlSchema: SchemaObject, ctx: OasContext, path: Array<string | number>, parentValue: PlainObject | Array<any>): Error[] => {
  const schemaResult = oasFollowPathFrom(path, [urlSchema], ctx)
  if (schemaResult.length === 0) {
    // console.log("No schema found for path", {path})
    return [{atPath: path, type: "keyError", hint: "Bad key"}]
  }
  const targetValue = (parentValue as any)[path[path.length - 1]]
  const possibleTypesDuplicated = schemaResult.flatMap((schema) => unrollOne(schema, ctx)).flatMap((schema) => {
    if ("type" in schema) {
      return [schema["type"]]
    }
    else if (isArray(schema)) {
      return ["array"]
    }
    return []
  });
  const possibleTypes = [...new Set(possibleTypesDuplicated)];
  if (Array.isArray(targetValue)) {
      if (!schemaResult.some((schema) => {return unrollOne(schema, ctx).some(isArray)})) {
        // console.log("shouldn't have been an array", {path, schemaResult, parentValue, targetValue})
        return [{atPath: path, type: "formatError", hint: "Cannot be an array", possibleTypes}]
      }
  }
  else if (typeof targetValue === 'object' && targetValue !== null) {
      if (!schemaResult.some((schema) => {return unrollOne(schema, ctx).some(isObject)})) {
        // console.log("shouldn't have been an object", {path, schemaResult, parentValue, targetValue})
        return [{atPath: path, type: "formatError", hint: "Cannot be an object", possibleTypes}]
      }
  }
  // if (determinant === ARR) {
  //   const parentArr: Array<string|number> = parentValue as any
  // }
  // else {
  //   const parentObj: Array<string|number> = parentValue as any
  // }

  // console.log("Schema found for path", {path, schemaResult})
  return []
}

function validateFormat(path: Array<string | number>, value: Scalar | PlainObject | Array<any>, urlSchema: SchemaObject, ctx: OasContext): Error[] {
  const rolledSchemaResult = oasFollowPathFrom(path, [urlSchema], ctx)
  const schemaResult = rolledSchemaResult.flatMap((schema) => unrollOne(schema, ctx))
  // console.log("Schema found for path", {path, schemaResult})
  const possibleTypesDuplicated = schemaResult.flatMap((schema) => unrollOne(schema, ctx)).flatMap((schema) => {
    if ("type" in schema) {
      return [schema["type"]]
    }
    else if (isArray(schema)) {
      return ["array"]
    }
    return []
  });
  const possibleTypes = [...new Set(possibleTypesDuplicated)];
  possibleTypes.sort()
  if (schemaResult.length === 0) {
    return [{atPath: path, type: "keyError", hint: "Bad key"}]
  }
  if (Array.isArray(value)) {
    if (!schemaResult.some(isArray)) {
      return [{atPath: path, type: "formatError", hint: "Cannot be an array", possibleTypes}]
    }
  } else if (typeof value === 'object' && value !== null) {
    if (!schemaResult.some(isObject)) {
      return [{atPath: path, type: "formatError", hint: "Cannot be an object", possibleTypes}]
    }
  }
  else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    // const anyPlausibleSchemaMatches = schemaResult.some((schema)=>{
    //   if (!("type" in schema)) {
    //     console.warn("No type specified in schema", {path, schema})
    //     return true; // no type specified, assume it's fine, since oas seems to be broken and request may be actually correct
    //   }
    //   if (schema.type === typeof value) {
    //     console.log("Plausible schema match", {path, schema, value})
    //     return true
    //   }
    //   return false
    // })
    if (!possibleTypes.includes(typeof value)) {
      return [{atPath: path, type: "formatError", hint: "Cannot be a " + typeof value, possibleTypes}]
    }
  }
  // Validate format
  // for (let i = 0; i < schemaResult.length; i++) {
  //   let schema = schemaResult[i]
  //   if (isReference(schema)) {
  //     schema = resolveRef((schema as ReferenceSchemaObject).$ref, ctx)
  //   }
  //   if (isObject(schema)) {

  //   }
  //   if (isPrimitive(schema)) {
  //     if (schema.format) {
  //       // Validate format
  //     }
  //   }
  // }
  return []
}

function validateJsonRequest(req: any, urlSchema: SchemaObject, ctx: OasContext): Error[] {
  const errors: Error[] = []
  util.traverse(
    req,
    /*if leaf*/ (path: util.Path, value: Scalar | PlainObject | Array<any>) => {
      const errs = validateFormat(path, value, urlSchema, ctx)
      errors.push(...errs)
    },
    /*if object*/ (path: Array<string | number>, parentValue: PlainObject | Array<any>) => {
      const errs: Error[] = validatePath(OBJ, urlSchema, ctx, path, parentValue)
      if (errs.length > 0) {
        errors.push(...errs)
        // console.log("should not dive deeper", {path, parentValue})
        return false // should not dive deeper
      }
      // console.log("diving deeper", {path, parentValue})
      return true // should dive deeper
    },
    /*if array*/ (path: Array<string | number>, parentValue: PlainObject | Array<any>) => {
      const errs: Error[] = validatePath(ARR, urlSchema, ctx, path, parentValue)
      if (errs.length > 0) {
        errors.push(...errs)
        // console.log("should not dive deeper", {path, parentValue})
        return false // should not dive deeper
      }
      // console.log("diving deeper", {path, parentValue})
      return true // should dive deeper
    }
  );
  return errors;
}

export function validateRequest(
  httpData: HttpData,
  json: string,
  ctx: OasContext
): Error[] {
  const { method, path: httpPath } = httpData;
  const requestBodySchemaObject = findSchema(method, httpPath, ctx);
  if (!requestBodySchemaObject) {
    console.warn("No schema found for request body");
    return [{type: "urlError", }];
  }
  try {
    const req = JSON.parse(json);
    return validateJsonRequest(req, requestBodySchemaObject, ctx);
  }
  catch (err) {
    console.warn("Invalid JSON", {json});
    throw err
  }
}