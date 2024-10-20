import { EditorView, basicSetup } from 'codemirror'
// import {syntaxHighlighting, defaultHighlightStyle} from "@codemirror/language"
import {EditorState} from "@codemirror/state"
import {EditorViewConfig} from "@codemirror/view"
// import { highlightTag } from "@codemirror/language";
// import {getStyleTags} from "@lezer/highlight"
// import {Parser} from "@lezer/common"

// Replace this import with your language support package
import {http} from '@local/oas-ls-codemirror';
// import { jsonLanguage } from '@codemirror/lang-json';

// If you're testing your own package, import it instead
// import yourLanguageSupport from 'your-language-support-package-name';

let json_code = `
{
  "key": "value",
  "array": [1, 2, 3],
  "nested": { "a": "b" }
}
`.trim()
let code = `
POST /api/data HTTP/1.1
Host: example.com
Content-Type: application/json

${json_code}
`.trim()
// console.log(defaultHighlightStyle)
// function printNodeTags(cursor, code, depth = 0) {
//   const nodeType = cursor.node.type;
//   const nodeName = nodeType.name;
//   const from = cursor.from;
//   const to = cursor.to;
//   const text = code.slice(from, to);

//   // Get the highlight tag associated with this node type
//   const tag = nodeType.prop(highlightTag);

//   console.log(`${'  '.repeat(depth)}Node: ${nodeName}, Text: "${text}", Tag: ${tag || 'None'}`);

//   if (cursor.firstChild()) {
//     do {
//       printNodeTags({ cursor }, code, depth + 1);
//     } while (cursor.nextSibling());
//     cursor.parent();
//   }
// }

// {
//   console.group("HTTP");
//   let t = parse_http(code)
//   let c = t.cursor()
//   let cont = true
//   while (cont) {
//     // console.dir(c)
//     console.dir(c.type)
//     // printNodeTags(c)
//     cont = c.next()
//   }
//   console.groupEnd();
// }
// function printTags(logGroup: string, parse: Function, code: string) {
//   console.group(logGroup);
//   let t = parse(code)
//   let c = t.cursor()
//   let cont = true
//   while (cont) {
//     // console.dir(c)
//     let tags = getStyleTags(c)
//     if (tags) {
//       // console.dir(c.type)
//       for (let tag of tags.tags) {
//         console.log(tag.toString())
//       }
//     }
//     // printNodeTags(c)
//     cont = c.next()
//   }
//   console.groupEnd();
// }
// function parse_json(code: string) {
//   return jsonLanguage.parser.parse(code)
// }
// printTags("HTTP", parse_http, code)
// printTags("JSON", parse_json, json_code)
// console.log(parse_http(code))
let cfg: EditorViewConfig = {
  doc: code,
  extensions: [basicSetup, http()],
  parent: document.getElementById('editor') as HTMLElement,
}
let state: EditorState = EditorState.create(cfg)
cfg.state = state

let v = new EditorView(cfg);
// console.log(state)

// function offset_to_linecol(text, offset) {

// }


// function debug_tags(tree_buffer, tree_offset) {
//   console.group()
//   let typesarr = tree_buffer.set.types
//   let buffer = tree_buffer.buffer
//   for (let ti = 0; ti < buffer.length; ti+=4) {
//     // console.log(typesarr[ti])
//     let type = typesarr[buffer[ti + 0]]
//     let typename = type.name
//     let rule = type.props[8]
//     let tag = undefined
//     if (rule) {
//       tag = rule.tags[0].name
//     }
//     let start = buffer[ti + 1]
//     let end = buffer[ti + 2]
//     let string = code.substring(start + tree_offset, end + tree_offset)
//     console.log({ti, typename, tag, string})
//   }
//   console.groupEnd()
// }
// debug_tags(state.tree.children[0].children[0], 0)
// debug_tags(state.tree.children[0].children[1].props[6].tree.children[0], 74)
