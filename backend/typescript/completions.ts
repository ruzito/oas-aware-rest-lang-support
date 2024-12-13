import { CompletionType, Markdown, Completion, OasContext } from "./types.js"
import * as parser from "./request-parser.js"
import { named, children, predecessors, debug, printTree, indexOf } from "./treesitter-wrapper.js"
import { HTTP_SEPARATOR, SEPARATOR_EXPLANATION } from "./constants.js"
import { exposeDebug, reversed, reduce } from "./utils.js"
import { SyntaxNode, Tree } from "web-tree-sitter"

type HttpData = {
    method: string,
    path: string,
    headers: Array<{key: string, val: string}>
} | null
async function requestJsonCompletions(tree: Tree, offset: number, httpData: HttpData = null): Promise<Completion[]> {
    console.log("Requesting JSON Completions")
    const jpath = await parser.getJPath(tree, offset)
    console.log({jpath})
    // TODO: get OAS definition on the jpath
    // TODO: filter the options based on hint
    // TODO: prepare replace action
    return [
        { name: jpath.path.toString(), begin: offset, end: offset, result: "", type: CompletionType.DUMMY_TYPE, brief: JSON.stringify(jpath.tail), doc: "" }
    ]
}
const addOffset = (subtreeBegin: number) => (completion: Completion): Completion => {
    const {name, result, type, brief, doc, begin, end} = completion
    return {
        name,
        result,
        type,
        brief,
        doc,
        begin: subtreeBegin + begin,
        end: subtreeBegin + end
    }
}
export async function requestCompletions(text: string, offset: number, ctx: OasContext): Promise<Completion[]> {
    const trees = await parser.parse(text)
    exposeDebug({trees})
    if (trees === null) {
        let newline = text.indexOf('\n', offset)
        let copy = text.substring(offset, newline)
        let result = `${copy}\n${HTTP_SEPARATOR.repeat(5)}\n`
        return [
            { name: "separator", begin: offset, end: newline, result, type: CompletionType.DUMMY_TYPE, brief: "Add separator between HTTP and JSON body", doc: SEPARATOR_EXPLANATION }
        ]
    }

    const httpOffset = (offset >= trees.jsonBegin) ? null : offset
    const jsonOffset = (offset >= trees.jsonBegin) ? offset - trees.jsonBegin : null

    type header = {key: string, val: string, txt: string}
    let method: string | null = null
    let path: string | null = null
    let headers: Array<header> = []
    for (let node of named(children(trees.http.rootNode))) {
        if (method === null && node.type === "method") {
            method = node.text
        }
        if (path === null && node.type === "path") {
            path = node.text
        }
        if (node.type === "header") {
            const hdr: header = {
                txt: node.text,
                key: named(children(node), "header_key").next().value?.text ?? "",
                val: named(children(node), "header_value").next().value?.text ?? ""
            }
            headers.push(hdr)
        }
    }

    if (jsonOffset !== null) {
        const comps = await requestJsonCompletions(trees.json, jsonOffset, {method: method ?? "GET", path: path ?? "/", headers})
        let newComps = comps.map(addOffset(trees.jsonBegin))
        // console.warn({offset, jsonOffset, jsonBegin: trees.jsonBegin})
        // console.warn(newComps)
        // console.warn({ name: "insert", begin: offset, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" })
        return newComps
    }

    if (httpOffset !== null) {
        // const comps = await requestHttpCompletions(trees.http, httpOffset, {method: method ?? "GET", path: path ?? "/", headers})
        // return comps
    }

    return [
        { name: "insert", begin: offset, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_before", begin: offset - 3, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_after", begin: offset, end: offset + 3, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_both", begin: offset - 3, end: offset + 3, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
    ]
}
