import { HttpData, OasContext } from "./types";
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
  findSchema
} from "./oas-wrapper-common";

import oasValidator from 'openapi-request-validator';

// Dumb fix for EsModuleInterop: true not set in the library
const OpenAPIRequestValidator = ((oasValidator as any).default) as (typeof oasValidator);

import { OpenAPIV3 } from 'openapi-types';
import { ErrorObject } from "ajv";

export function validateRequest(
  httpData: HttpData,
  json: string,
  ctx: OasContext
): ErrorObject[] {
  const { method, path: httpPath } = httpData;
  const requestBodySchemaObject = findSchema(method, httpPath, ctx);
  if (!requestBodySchemaObject) {
    console.warn("No schema found for request body");
    return [];
  }
  const requestValidator = new OpenAPIRequestValidator({
    requestBody: { // optional OpenApi v3 requestBodyObject
      content: {
        'application/json': {
          schema: requestBodySchemaObject as OpenAPIV3.SchemaObject
        }
      }
    }
  });
  const validationResult = requestValidator.validateRequest({body: JSON.parse(json)});
  // console.log({validationResult});
  if (validationResult?.errors) {
    return validationResult.errors;
  }
  return []
}