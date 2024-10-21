import { EditorView, basicSetup } from 'codemirror'
import {EditorState} from "@codemirror/state"
import {EditorViewConfig} from "@codemirror/view"
import {http, loadOAS} from '@local/oas-ls-codemirror';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import {tags} from "@lezer/highlight"

// Example HTTP request

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

// Setup Codemirror

const myHighlightStyle = HighlightStyle.define([
  {tag: tags.propertyName, color: "#05c"},
  // {tag: tags.url, color: "#fc6"},
  // {tag: tags.keyword, color: "#fc6"},
  // {tag: tags.variableName, color: "#fc6"},
  // {tag: tags.string, color: "#fc6"},
  // {tag: tags.number, color: "#fc6"},
])

let cfg: EditorViewConfig = {
  doc: code,
  extensions: [basicSetup, http(), syntaxHighlighting(myHighlightStyle)],
  parent: document.getElementById('editor') as HTMLElement,
}
let state: EditorState = EditorState.create(cfg)
cfg.state = state

new EditorView(cfg);

// Load Open API Specification

const inputElement = document.getElementById('oas-url') as HTMLInputElement;
const loadBtn = document.getElementById('oas-url-btn') as HTMLInputElement;

async function setOAS(oas: string): Promise<void> {
  console.log("load", oas)
  await loadOAS(oas)
}

async function getOAS(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
      throw new Error('Network response was not ok');
  }
  const data = await response.text();
  return data;
}

loadBtn.addEventListener('click', async (event: Event) => {
    console.log(inputElement.value);
    let url = inputElement.value
    try {
      let oas = await getOAS(url)
      await setOAS(oas)
    }
    catch (err) {
      alert(`Error fetching OAS:\nurl: ${url}\nerror: ${err}`)
    }
});
