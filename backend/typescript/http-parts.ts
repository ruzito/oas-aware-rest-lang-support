import { Tree } from "web-tree-sitter";
import { HttpData } from "./types";
import { children, named } from "./treesitter-wrapper";

export function parseHttpData(http: Tree): HttpData {
  type header = { key: string; val: string; txt: string };
  let method: string | null = null;
  let path: string | null = null;
  let headers: Array<header> = [];
  for (let node of named(children(http.rootNode))) {
    if (method === null && node.type === "method") {
      method = node.text;
    }
    if (path === null && node.type === "path") {
      path = node.text;
    }
    if (node.type === "header") {
      const hdr: header = {
        txt: node.text,
        key: named(children(node), "header_key").next().value?.text ?? "",
        val: named(children(node), "header_value").next().value?.text ?? "",
      };
      headers.push(hdr);
    }
  }
  return { method: method ?? "GET", path: path ?? "/", headers};
}
