import { EditorView, basicSetup } from 'codemirror'
import {EditorState} from "@codemirror/state"
import {EditorViewConfig, keymap} from "@codemirror/view"
import * as oasFrontend from '@ruzito/oas-ls-codemirror';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import {tags} from "@lezer/highlight"
import {indentWithTab} from "@codemirror/commands"

//////////////////////
// Setup Codemirror //
//////////////////////

const myHighlightStyle = HighlightStyle.define([
  {tag: tags.propertyName, color: "#05c"},
  // {tag: tags.url, color: "#fc6"},
  // {tag: tags.keyword, color: "#fc6"},
  // {tag: tags.variableName, color: "#fc6"},
  // {tag: tags.string, color: "#fc6"},
  // {tag: tags.number, color: "#fc6"},
])

const oasContext = oasFrontend.initOasContext()

const httpData: oasFrontend.HttpData = {method: "POST", path: "/Product/query", headers: []}

async function getHttpData(): Promise<oasFrontend.HttpData> {
  return httpData
}

function setupEditorView(selector: string, jsonOnly: boolean, request: string) {
  let ext: any = null
  if (jsonOnly === false) {
    ext = oasFrontend.http(oasContext)
  }
  else {
    ext = oasFrontend.json(oasContext, getHttpData)
  }

  const cfg: EditorViewConfig = {
    doc: request,
    extensions: [basicSetup, ext, syntaxHighlighting(myHighlightStyle), keymap.of([indentWithTab])],
    parent: document.querySelector(selector) as HTMLElement,
  }
  let state: EditorState = EditorState.create(cfg)
  cfg.state = state
  new EditorView(cfg);
}

setupEditorView('#editor', false, `
POST /Brand/list HTTP/1.1
Host: example.com
Content-Type: application/json

-----

{
  
}
`.trim())

setupEditorView('#editor-json', true, `
{
  "key": "value",
  "a": {
     "b": {
       "c": [
         {"d": {}}
       ]
     }
  },
  "array": [1, 2, 3],
  "nested": { "a": "b" }
}
`.trim())

setupEditorView('#editor-product-query', false, `
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
setupEditorView('#editor-locale-path', false, `
POST /cs_CZ/Tag/list HTTP/1.1
Host: example.com
Content-Type: application/json

-----

{
  
}
`.trim())

////////////////
// OAS Loader //
////////////////

const inputElement = document.getElementById('oas-url') as HTMLInputElement;
const loadBtn = document.getElementById('oas-url-btn') as HTMLInputElement;

loadBtn.addEventListener('click', async (event: Event) => {
    // console.log(inputElement.value);
    let url = inputElement.value
    let statusLabel = document.getElementById('oas-status') as HTMLElement;
    try {
      statusLabel.textContent = "Status: Loading..."
      await oasFrontend.fetchOas(url, oasContext)
      statusLabel.textContent = "Status: Loaded"
    }
    catch (err) {
      statusLabel.textContent = "Status: Error"
      alert(`Error fetching OAS:\nurl: ${url}\nerror: ${err}`)
    }
});

//////////
// Tabs //
//////////

const tabcontainer = document.querySelector(".tabcontainer") as HTMLElement;
const tabs = document.querySelectorAll(".tabcontent") as NodeListOf<HTMLElement>;
const tabbtns: HTMLElement[] = []
const tabids: string[] = []

function openTab(tabid: string) {
  for (let tab of tabs) {
    tab.style.display = "none";
  }
  for (let btn of tabbtns) {
    btn.classList.remove("active");
  }
  const clickedTab = document.querySelector(`.tabid-${tabid}`) as HTMLElement;
  clickedTab.style.display = "block";
  const tgt = document.querySelector(`.tabbtn-${tabid}`) as HTMLElement;
  if (tgt) {
    tgt.classList.add("active");
  }
}

for (let tab of tabs) {
  let tabid = ""
  tab.classList.forEach((cls) => {
    if (cls.startsWith("tabid-")) {
      tabid = cls.slice(6)
    }
  });
  tabids.push(tabid)
  const tabbtn = document.createElement("button");
  tabbtn.textContent = tabid.replace(/--/g, " ");
  tabbtn.classList.add("tabbtn");
  tabbtn.classList.add("tabbtn-" + tabid);
  tabbtn.addEventListener("click", (evt) => {openTab(tabid)});
  tabbtns.push(tabbtn)
  tabcontainer.appendChild(tabbtn);
}

openTab('Brand--List')

////////////////////////
// json-only controls //
////////////////////////

const methodSelector = document.getElementById('req-method') as HTMLInputElement;
const urlInput = document.getElementById('req-url') as HTMLInputElement;

methodSelector.addEventListener('change', (event: Event) => {
  httpData.method = methodSelector.value
})

urlInput.addEventListener('change', (event: Event) => {
  httpData.path = urlInput.value
})