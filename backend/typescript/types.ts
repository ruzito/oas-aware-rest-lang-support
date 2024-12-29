export type Markdown = string | ""
export type PlainString = string | ""

export type Completion = { name: string, result: string, begin: number, end: number, type: CompletionType, brief: PlainString, doc: Markdown }
export type Hint = { name: string, begin: number, end: number, type: HintType, brief: PlainString, doc: Markdown }

export enum CompletionType {
    DUMMY_TYPE = "dummyType",
    OBJECT_KEY = "object_key",
    VALUE = "value",
    PATH = "path",
    METHOD = "method"
}
export enum HintType {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
}

export type OasSpec = {[key: string]: any} | null

// null => could not fetch

export type OasContext = {
    root: OasSpec,
    externalRefs: { [url: string]: OasSpec }
}

type EnumObject<T> = T[keyof T]

export const CompletionKind = {
  OBJECT_KEY: "objectKey",
  OBJECT_VALUE: "objectValue",
  ARRAY_ELEMENT: "arrayElement",
  ROOT_VALUE: "root",
  UNKNOWN: "unknown"
} as const;

export type CompletionKind = EnumObject<typeof CompletionKind>

export type JPathTail = { kind: CompletionKind, hint: string, range: {beginOffset: number, endOffset: number} };
export type JPathBody = Array<string | number | undefined>;

export type JPath = { path: JPathBody; tail: JPathTail };

export type HttpData = {
    method: string,
    path: string,
    headers: Array<{key: string, val: string}>
}
