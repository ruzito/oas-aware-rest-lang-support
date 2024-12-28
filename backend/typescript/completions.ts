import { CompletionType, Markdown, Completion, OasContext, OasSpec } from "./types.js"
import * as parser from "./request-parser.js"
import { named, children, predecessors, debug, printTree, indexOf } from "./treesitter-wrapper.js"
import { HTTP_SEPARATOR, SEPARATOR_EXPLANATION } from "./constants.js"
import { exposeDebug, reversed, reduce } from "./utils.js"
import { SyntaxNode, Tree } from "web-tree-sitter"
import { JPath, HttpData } from "./types.js"
import { getObjectKeys, oasFollowPath } from "./oas-wrapper.js"
import { parseHttpData } from "./http-parts.js"
import { Fzf } from "fzf";

async function requestJsonCompletions(tree: Tree, offset: number, httpData: HttpData, ctx: OasContext): Promise<Completion[]> {
    console.log("Requesting JSON Completions")
    const jpath = await parser.getJPath(tree, offset)
    console.log({jpath})
    const oasAtPath = oasFollowPath(jpath.path, httpData, ctx)
    let comps: Completion[] = []
    // First attempt:
    if (jpath.tail.kind === "objectKey") {
        comps = getObjectKeys(oasAtPath, ctx).flatMap((key) => {
            return key.schemas.map((schema: any) => {
                const desc = (schema as any)?.description
                return {
                    name: key.name,
                    result: `"${key.name}"`,
                    type: CompletionType.DUMMY_TYPE,
                    begin: jpath.tail.range.beginOffset,
                    end: jpath.tail.range.endOffset,
                    brief: desc ? "" : key.name,
                    doc: desc ?? ""
                }
            })
        });
    }
    else {
        console.warn("Not implemented")
    }
    if (jpath.tail.hint !== "") {
        comps = new Fzf(comps, {
            // With selector you tell FZF where it can find
            // the string that you want to query on
            selector: (item) => item.name,
        }).find(jpath.tail.hint).map((entry) => {
            const it = entry.item
            // it.name = `${it.name} : ${entry.score}`
            return it
        });
    }
    return comps
    // return [
    //     { name: jpath.path.toString(), begin: offset, end: offset, result: "", type: CompletionType.DUMMY_TYPE, brief: JSON.stringify(jpath.tail), doc: "" }
    // ]
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
    const {method, path, headers} = parseHttpData(trees.http)
    if (jsonOffset !== null) {
        const comps = await requestJsonCompletions(trees.json, jsonOffset, {method: method ?? "GET", path: path ?? "/", headers}, ctx)
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
