import { CompletionType, HintType, Markdown, Completion, Hint, OasContext } from "./types.js"
import * as parser from "./request-parser.js"
import { named, children, predecessors, debug, printTree, indexOf, errors, successors } from "./treesitter-wrapper.js"
import { SyntaxNode, Tree } from "web-tree-sitter"
import { HTTP_SEPARATOR, SEPARATOR_EXPLANATION } from "./constants.js"


function errorReport(text: string, nodeError: SyntaxNode, rowOffset: number = 0): {brief: string, doc: string} {
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



export async function requestHints(text: string, ctx: OasContext): Promise<Hint[]> {
    const trees = await parser.parse(text)

    if (trees === null) {
        return [
            { name: "Missing separator", begin: 0, end: text.length, type: HintType.ERROR, brief: "Add separator between HTTP and JSON body", doc: SEPARATOR_EXPLANATION }
        ]
    }

    const hints: Hint[] = []

    for (let node of errors(successors(trees.http.rootNode))) {
        let endIndex = node.endIndex
        if (node.startIndex === node.endIndex) {
            endIndex += 1
        }
        hints.push({
            name: "HTTP syntax error",
            begin: node.startIndex,
            end: endIndex,
            type: HintType.ERROR,
            ...errorReport(trees.httpText, node)
        })
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

    return hints
}