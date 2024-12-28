import { CompletionType, HintType, Markdown, Completion, Hint, OasContext, HttpData } from "./types.js"
import * as parser from "./request-parser.js"
import { named, children, predecessors, debug, printTree, indexOf, errors, successors } from "./treesitter-wrapper.js"
import { SyntaxNode, Tree } from "web-tree-sitter"
import { HTTP_SEPARATOR, SEPARATOR_EXPLANATION } from "./constants.js"
import { validateRequest } from "./oas-wrapper-validate.js"
import { parseHttpData } from "./http-parts.js"


function errorReport(text: string, nodeError: SyntaxNode, rowOffset: number = 0): {brief: string, doc: string} {
    // Currently the error message for syntax errors is not very helpful
    // since it's just a JSON it is actually less confusing
    // to just underline the error.
    //
    // Hence:
    return {brief: "", doc: ""}

    const textLines = text.split("\n")
    const errLineNo = nodeError.startPosition.row + 1
    const columnStart = nodeError.startPosition.column + 1
    const columnEnd = nodeError.endPosition.column + 1
    const lineNo = `${errLineNo + rowOffset}:`
    let report = "```\n"
    report += `${lineNo}${textLines[errLineNo-1]}\n`
    const padding_with_line_number = " ".repeat(`${lineNo}`.length + columnStart-1)
    const cursorSize = Math.max(1, columnEnd - columnStart)
    report += `${padding_with_line_number}${'~'.repeat(cursorSize)}\n`
    
    let tsErrorBrief = nodeError.toString().slice(1, -1)
    let error_message
    if (nodeError.isMissing) {
        error_message = `${nodeError.toString().slice(1, -1)}`
    }
    else {
        const unexpected_tokens = nodeError.children[0]?.text
        tsErrorBrief = `Unexpected token(s): \`(${unexpected_tokens === undefined ? "" : unexpected_tokens})\``
    }
    report += "```\n"

    return {brief: tsErrorBrief, doc: report}
}

function followPathInJsonTree(path: Array<string|number>, rootNode: SyntaxNode): SyntaxNode {
    let current = rootNode
    for (let i = 0; i < path.length; i++) {
        const p = path[i]
        if (current.childCount === 0) {
            console.error("Current node has no children")
            return null as any
        }
        if (typeof p === "number") {
            if (current.type !== "array" || current.namedChildCount <= p) {
                console.error("Array index out of bounds or not an array:", current.type, "at index", p)
                return null as any
            }
            current = current.namedChildren[p]
        }
        else if (typeof p === "string") {
            if (current.type !== "object") {
                console.warn("Not an object:", current.type)
                return null as any
            }
            const pair = current.namedChildren.find((child) => child.type === "pair" && child.firstNamedChild?.firstNamedChild?.text === p)
            if (pair === undefined) {
                console.warn("Key not found", current.type, current.namedChildren.map((child) => child.firstNamedChild?.firstNamedChild?.text))
                return null as any
            }
            if (i === path.length - 1) {
                const key = pair.firstChild
                if (key === null) {
                    console.error("Pair has no first child")
                    return null as any
                }
                return key
            }
            if (pair.lastChild === null) {
                console.error("Pair has no last child")
                return null as any
            }
            current = pair.lastChild
        }
    }
    return current
}

export async function requestHints(text: string, ctx: OasContext): Promise<Hint[]> {
    const trees = await parser.parse(text)

    if (trees === null) {
        return [
            { name: "Missing separator", begin: 0, end: text.length, type: HintType.ERROR, brief: "Add separator between HTTP and JSON body", doc: SEPARATOR_EXPLANATION }
        ]
    }

    const hints: Hint[] = []

    for (let node of errors(successors(trees.http.rootNode))) {
      let endIndex = node.endIndex;
      if (node.startIndex === node.endIndex) {
        endIndex += 1;
      }
      hints.push({
        name: "HTTP syntax error",
        begin: node.startIndex,
        end: endIndex,
        type: HintType.ERROR,
        ...errorReport(trees.httpText, node),
      });
    }
    for (let node of errors(successors(trees.json.rootNode))) {
        let endIndex = node.endIndex
        if (node.startIndex === node.endIndex) {
            endIndex += 1
        }
        hints.push({
            name: "JSON syntax error",
            begin: node.startIndex + trees.jsonBegin,
            end: endIndex + trees.jsonBegin,
            type: HintType.ERROR,
            ...errorReport(trees.jsonText, node, trees.httpText.split("\n").length)
        })
    }

    if (hints.length > 0) {
        console.log({hints, trees})
        return hints
    }
    const httpData = parseHttpData(trees.http)
    const validationResult = validateRequest(httpData, trees.jsonText, ctx)
    console.log({validationResult})
    const topNode = trees.json.rootNode.namedChildren[0]
    for (let res of validationResult) {
        hints.push({
            name: "Validation error",
            begin: res.atPath.length === 0 ? trees.jsonBegin : followPathInJsonTree(res.atPath, topNode)?.startIndex + trees.jsonBegin,
            end: res.atPath.length === 0 ? trees.jsonBegin + trees.jsonText.length : followPathInJsonTree(res.atPath, topNode)?.endIndex + trees.jsonBegin,
            type: HintType.ERROR,
            brief: res.hint,
            doc: ""
        })
    }
    return hints
}