export type Markdown = string | ""
export type PlainString = string | ""

export type Completion = { name: string, result: string, begin: number, end: number, type: CompletionType, brief: PlainString, doc: Markdown }
export type Hint = { name: string, begin: number, end: number, type: HintType, brief: PlainString, doc: Markdown }

export enum CompletionType {
    DUMMY_TYPE = "dummyType",
}
export enum HintType {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
}