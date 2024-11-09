import Parser from "web-tree-sitter";


let tsParser: Parser | null = null

import tswasm from 'tree-sitter.wasm';
import grammarwasm from 'tree-sitter-grammar.wasm';

// var require: any;
async function getParser(): Promise<Parser> {
    if (tsParser === null) {
        console.log("Initializing tree-sitter")
        await Parser.init({"wasmBinary": tswasm})
        tsParser = new Parser
        const lang = await Parser.Language.load(grammarwasm)
        tsParser.setLanguage(lang)
    }
    return tsParser
}

enum context_part {
    METHOD,
    PATH,
    HEADER,
    BODY
}
enum context_type {
    KEY,
    VALUE
}
// type cursor_context: (context_type, )
// type request_body_context = {complete: object, completePath: Path, cursorIn: cursor_context}

type cursor_part = "METHOD" | "PATH" | "HEADER" | "BODY"

type cursor = {part: cursor_part}

type method_cursor = {part: "METHOD", offset: number}

enum section_type {
    METHOD,
    PATH,
    HEADERS,
    BODY
}

enum tag_type {
    METHOD,
    PATH_PART,
    HEADER_KEY,
    HEADER_SEPARATOR,
    HEADER_VALUE,
    BODY_KEY,
    BODY_VALUE
}

type tag = {tag: tag_type, section: section_type, beginOffset: number, endOffset: number}

export async function parse(req: string, offset: number): Promise<Array<tag_type>> {
    const parser = await getParser()
    console.log(parser.parse(req).rootNode.toString())
    return []
}

// export async function parse(req: string, offset: number): Promise<Array<tag_type>> {
//     let method: tag = {tag: tag_type.METHOD, section: section_type.METHOD, beginOffset: 0, endOffset: 0}
//     let path: tag = {tag: tag_type.METHOD, section: section_type.METHOD, beginOffset: 0, endOffset: 0}
//     let headers: tag = {tag: tag_type.METHOD, section: section_type.METHOD, beginOffset: 0, endOffset: 0}
//     let body: tag = {tag: tag_type.METHOD, section: section_type.METHOD, beginOffset: 0, endOffset: 0}
//     {
//         let reqRaw = req
//         let offsetRaw = offset
//         {
//             let req = reqRaw.trimStart()                   // req with begin trimmed
//             let beginOffset = (reqRaw.length - req.length) // offset of the request from the beginning
//             req = req.trimEnd()                            // req with both sides trimmed
//             let endOffset = (reqRaw.length - req.length)   // offset of the end of the request
//             let lines = req.split("\n")
//             let topLine = lines[0].split(" ")
//             method.endOffset = topLine[0].length + beginOffset
//             path.beginOffset = method.endOffset + 1
//             path.endOffset = topLine[1].length + path.beginOffset
//         }

//     }
//     return []
// }