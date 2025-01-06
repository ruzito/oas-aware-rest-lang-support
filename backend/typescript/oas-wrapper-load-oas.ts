import { parse as parseYAML } from "yaml";

import * as util from "./utils.js";
import { OasContext, OasSpec, JPathBody, HttpData } from "./types.js";

export enum OasFormat {
  YAML = "YAML",
  JSON = "JSON",
}

export function initOasContext(): OasContext {
  return {
    root: null,
    externalRefs: {}
  };
}

async function parseOAS(spec: string, format: OasFormat): Promise<OasSpec> {
  // console.log("Parsing OAS", { spec, format });
  let pojo: util.PlainObject = {};
  let tryList = [(x: string) => JSON.parse(x), (x: string) => parseYAML(x)];
  if (format === OasFormat.YAML) {
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
    // console.log("Fetching OAS from", url, {ctx});
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
  // console.log("Fetched OAS from", url, {response});

  // Guess format
  let format = OasFormat.JSON;
  if (
    typeof contentType === "string" &&
    (contentType.includes("yml") || contentType.includes("yaml"))
  ) {
    format = OasFormat.YAML;
  }

  // parse to json
  let pojo = await parseOAS(spec, format);
  ctx.externalRefs[url] = pojo;

  // recurse through ref URLs
  await dereferenceURLs(pojo, ctx);
  return pojo;
}

async function dereferenceURLs(pojoOAS: OasSpec, ctx: OasContext) {
  // console.log("Dereferencing URLs", { pojoOAS, ctx });
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

export async function loadOas(
  oas: string,
  format: OasFormat = OasFormat.JSON,
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

export async function loadUrl(url: string, ctx: OasContext): Promise<void> {
  const root = await fetchOAS(url, ctx);
  ctx.root = root;
  if (ctx.root === null) {
    throw new Error(`Could not fetch OAS specification \`${url}\``);
  }
  console.log("Loaded OasContext from URL", { url, ctx });
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