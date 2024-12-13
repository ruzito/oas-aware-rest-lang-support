import * as wasm from "../build/asm.js"
import { CompletionType, HintType, Markdown, Completion, Hint, OasContext } from "./types.js"

export async function requestDocs(text: string, offset: number, ctx: OasContext): Promise<Markdown> {
    let doc_md = `
# Doc markdown
<h1>${wasm.add(3, 5)}</h1>
what is this
`.trim()
    return doc_md
}

export async function requestCompletions(text: string, offset: number, ctx: OasContext): Promise<Completion[]> {
    return [
        { name: "insert", begin: offset, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_before", begin: offset - 3, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_after", begin: offset, end: offset + 3, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
        { name: "replace_both", begin: offset - 3, end: offset + 3, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring" },
    ]
}

export async function requestHints(text: string, ctx: OasContext): Promise<Hint[]> {
    return [
        { name: "Unkown method", begin: 0, end: 4, type: HintType.ERROR, brief: "Methods can be only GET or POST", doc: "" },
        { name: "Unkown method", begin: 0, end: 4, type: HintType.ERROR, brief: "Methods can be only GET or POST", doc: "# Some doc" },
        { name: "Unkown method", begin: 0, end: 4, type: HintType.WARNING, brief: "Methods can be only GET or POST", doc: "" },
        { name: "Unkown method", begin: 0, end: 4, type: HintType.INFO, brief: "Methods can be only GET or POST", doc: "# Some doc" },
    ]
}
