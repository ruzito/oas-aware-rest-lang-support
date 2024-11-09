import { CompletionType, Markdown, Completion } from "./types.js"
import * as parser from "./request_parser.js"

export async function requestCompletions(text: string, offset: number): Promise<Completion[]> {
    const parstags = await parser.parse(text, offset)
    return [
        { name: "insert", begin: offset, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_before", begin: offset - 3, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_after", begin: offset, end: offset + 3, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_both", begin: offset - 3, end: offset + 3, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
    ]
}
