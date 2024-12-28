import { HttpData, OasContext, OasSpec } from "./types";
import { oasFollowPathInit, oasFollowPathFrom } from "./oas-wrapper-follow-path";
import { SyntaxNode, Tree } from "web-tree-sitter";
import {
  AllOfSchemaObject,
  ArraySchemaObject,
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
  unrollOne,
  resolveRef,
  findSchema,
  SchemaObject
} from "./oas-wrapper-common";

import * as util from './utils'

import { Scalar, PlainObject } from "./utils";

type Error = {
  atPath: Array<string | number>,
  hint: string
}

const ARR = 0
const OBJ = 1
const validatePath = (determinant: 0|1, urlSchema: SchemaObject, ctx: OasContext, path: Array<string | number>, parentValue: PlainObject | Array<any>): Error[] => {
  if (determinant === ARR) {
    const parentArr: Array<string|number> = parentValue as any
  }
  else {
    const parentObj: Array<string|number> = parentValue as any
  }
  const schemaResult = oasFollowPathFrom(path, [urlSchema], ctx)
  if (schemaResult.length === 0) {
    return [{atPath: path, hint: "No schema found"}]
  }
  return []
}

function validateFormat(path: Array<string | number>, value: Scalar, urlSchema: SchemaObject, ctx: OasContext): Error[] {
  const schemaResult = oasFollowPathFrom(path, [urlSchema], ctx)
  if (schemaResult.length === 0) {
    return [{atPath: path, hint: "No schema found"}]
  }
  // TODO: validate format
  return []
}

function validateJsonRequest(req: any, urlSchema: SchemaObject, ctx: OasContext): Error[] {
  const errors: Error[] = []
  util.traverse(
    req,
    (path: util.Path, value: util.Scalar) => {
      const errs = validateFormat(path, value, urlSchema, ctx)
      errors.push(...errs)
    },
    (path: Array<string | number>, parentValue: PlainObject | Array<any>) => {
      const errs: Error[] = validatePath(OBJ, urlSchema, ctx, path, parentValue)
      if (errs.length > 0) {
        errors.push(...errs)
        return false
      }
      return true
    },
    (path: Array<string | number>, parentValue: PlainObject | Array<any>) => {
      const errs: Error[] = validatePath(ARR, urlSchema, ctx, path, parentValue)
      if (errs.length > 0) {
        errors.push(...errs)
        return false
      }
      return true
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
    return [];
  }

  const req = JSON.parse(json);
  return validateJsonRequest(req, requestBodySchemaObject, ctx);
}