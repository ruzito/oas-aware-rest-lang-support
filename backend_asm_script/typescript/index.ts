import * as wasm from "../build/asm.js"

type Markdown = string | ""
type PlainString = string | ""
export const enum CompletionType {
    DUMMY_TYPE = "dummyType",
}
export const enum HintType {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
}

type Completion = {name: string, result: string, begin: number, end: number, type: CompletionType, brief: PlainString, doc: Markdown}
type Hint = {name: string, begin: number, end: number, type: HintType, brief: PlainString, doc: Markdown}

export async function loadOAS(oas: string) {

}

export async function requestDocs(text: string, offset: number): Promise<Markdown> {
    let doc_md = `
# Doc markdown
<h1>${wasm.add(3,5)}</h1>
what is this
`.trim()
    return doc_md
}

export async function requestCompletions(text: string, offset: number): Promise<Completion[]> {
    return [
        {name: "insert", begin: offset, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring"},
        {name: "replace_before", begin: offset-3, end: offset, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring"},
        {name: "replace_after", begin: offset, end: offset+3, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring"},
        {name: "replace_both", begin: offset-3, end: offset+3, result: "XXX", type: CompletionType.DUMMY_TYPE, brief: "brief", doc: "## Docstring"},
    ]
}

export async function requestHints(text: string): Promise<Hint[]> {
    return [
        {name: "Unkown method", begin: 0, end: 4, type: HintType.ERROR, brief: "Methods can be only GET or POST", doc: ""},
        {name: "Unkown method", begin: 0, end: 4, type: HintType.ERROR, brief: "Methods can be only GET or POST", doc: "# Some doc"},
        {name: "Unkown method", begin: 0, end: 4, type: HintType.WARNING, brief: "Methods can be only GET or POST", doc: ""},
        {name: "Unkown method", begin: 0, end: 4, type: HintType.INFO, brief: "Methods can be only GET or POST", doc: "# Some doc"},
    ]
}
