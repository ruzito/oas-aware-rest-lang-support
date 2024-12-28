import { EditorView, basicSetup } from 'codemirror'
import {EditorState} from "@codemirror/state"
import {EditorViewConfig, keymap} from "@codemirror/view"
import * as oasFrontend from '@local/oas-ls-codemirror';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import {tags} from "@lezer/highlight"
import {indentWithTab} from "@codemirror/commands"

// Example HTTP request

let evita_request = `
POST /Brand/list HTTP/1.1
Host: example.com
Content-Type: application/json

-----

{
  
}
`.trim()

let json_code = `
{
  "key": "value",
  "a": {
     "b": {
       "c": [
         {"d": }
       ]
     }
  },
  "array": [1, 2, 3],
  "nested": { "a": "b" }
}
`.trim()
let code = `
POST /api/data HTTP/1.1
Host: example.com
Content-Type: application/json

-----

${json_code}
`.trim()

// Setup Codemirror

const myHighlightStyle = HighlightStyle.define([
  {tag: tags.propertyName, color: "#05c"},
  // {tag: tags.url, color: "#fc6"},
  // {tag: tags.keyword, color: "#fc6"},
  // {tag: tags.variableName, color: "#fc6"},
  // {tag: tags.string, color: "#fc6"},
  // {tag: tags.number, color: "#fc6"},
])

const oasContext = oasFrontend.initOasContext()

function setupEditorView(selector: string, httpMeta: oasFrontend.HttpData | null, request: string) {
  let cfg: EditorViewConfig | null = null
  if (httpMeta === null) {
    cfg = {
      doc: request,
      extensions: [basicSetup, oasFrontend.http(oasContext), syntaxHighlighting(myHighlightStyle), keymap.of([indentWithTab])],
      parent: document.querySelector(selector) as HTMLElement,
    }
  }
  else {
    cfg = {
      doc: request,
      extensions: [basicSetup, oasFrontend.json(oasContext, async () => httpMeta), syntaxHighlighting(myHighlightStyle), keymap.of([indentWithTab])],
      parent: document.querySelector(selector) as HTMLElement,
    }
  }
  let state: EditorState = EditorState.create(cfg)
  cfg.state = state
  new EditorView(cfg);
}


// let cfg: EditorViewConfig = {
//   doc: evita_request,
//   extensions: [basicSetup, oasFrontend.http(oasContext), syntaxHighlighting(myHighlightStyle)],
//   parent: document.getElementById('editor') as HTMLElement,
// }
// let state: EditorState = EditorState.create(cfg)
// cfg.state = state

// new EditorView(cfg);

setupEditorView('#editor', null, evita_request)

// let cfg2: EditorViewConfig = {
//   doc: json_code,
//   extensions: [basicSetup, oasFrontend.json(oasContext), syntaxHighlighting(myHighlightStyle)],
//   parent: document.getElementById('editor2') as HTMLElement,
// }
// let state2: EditorState = EditorState.create(cfg2)
// cfg2.state = state2

// new EditorView(cfg2);

setupEditorView('#editor2', {method: "POST", path: "/Product/query", headers: []}, json_code)

setupEditorView('#editor-product-query', null, `
POST /Product/query HTTP/1.1
Host: example.com
Content-Type: application/json

-----

{
  "filterBy": {
    "referenceTagsHaving": [
      {
        
      }
    ]
  }
}
`.trim())
setupEditorView('#editor-locale-path', null, `
POST /cz_CS/Tag/list HTTP/1.1
Host: example.com
Content-Type: application/json

-----

{
  
}
`.trim())

// Load Open API Specification

const inputElement = document.getElementById('oas-url') as HTMLInputElement;
const loadBtn = document.getElementById('oas-url-btn') as HTMLInputElement;

loadBtn.addEventListener('click', async (event: Event) => {
    // console.log(inputElement.value);
    let url = inputElement.value
    try {
      await oasFrontend.fetchOas(url, oasContext)
    }
    catch (err) {
      alert(`Error fetching OAS:\nurl: ${url}\nerror: ${err}`)
    }
});
