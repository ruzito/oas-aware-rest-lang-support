import { autocompletion } from '@codemirror/autocomplete'
import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import { EditorView, Tooltip, hoverTooltip } from '@codemirror/view';
import { parser } from './http_parser';
import { LRLanguage, LanguageSupport, HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { jsonLanguage } from '@codemirror/lang-json';
import { parseMixed } from '@lezer/common';
import {tags} from "@lezer/highlight"
import {linter, Diagnostic} from "@codemirror/lint"

import * as be from '@local/oas-ls-backend-asm-script';

import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: true,
});

/**
 * Define the custom HTTP language with nested JSON in the body.
 */ 
const customHttpLanguage = LRLanguage.define({
  parser: parser.configure({
    wrap: parseMixed((node) => {
      if (node.type.name === 'Body') {
        // Return a parser for the JSON content
        return { parser: jsonLanguage.parser };
      }
      return null;
    }),
  }),
  languageData: {
    // Optionally, add language-specific configurations
    commentTokens: { line: '#' }, // Example, if you have comments
  },
});

const highlightOverride = HighlightStyle.define([
  {tag: tags.propertyName, color: "#05c"},
])


async function renderMD(md_str: string): Promise<HTMLElement> {
  let dom = document.createElement('div');
  dom.innerHTML = md.render(md_str);
  return dom
}

async function requestTooltip(text: string, offset: number): Promise<Tooltip | readonly Tooltip[] | null> {
  console.log({request: "tooltip", text, offset})
  let docs = await be.requestDocs(text, offset)
  let dom = await renderMD(docs)
  return {
    "pos": offset,
    "create": (view: EditorView) => {return {dom}}
  }
}

function mapCompletionType(t: be.CompletionType): string {
  switch(t) {
    case be.CompletionType.DUMMY_TYPE:
      console.warn(`Dummy completion type, fallback to "namespace"`)
      return "namespace"
    default:
      console.warn(`Unknown completion type "${t}", fallback to "function"`)
      return "function"
  }
}

async function requestCompletion(text: string, offset: number): Promise<CompletionResult | null> {
  console.log({request: "completion", text, offset})
  let from = offset
  let to = offset
  let completions: Completion[] = await Promise.all((await be.requestCompletions(text, offset)).filter((comp) => {
    if (offset < comp.begin || offset > comp.end)
      return false
    if (comp.begin < from) {
      from = comp.begin
    }
    if (comp.end > to) {
      to = comp.end
    }
    return true
  }).map(async (comp): Promise<Completion> => {
    const prefix = text.substring(from, comp.begin)
    const suffix = text.substring(comp.end, to)
    const completion: Completion = {
      label: comp.name,
      detail: comp.brief,
      apply: `${prefix}${comp.result}${suffix}`,
      type: mapCompletionType(comp.type)
    };
    let node = await renderMD(comp.doc)
    completion.info = (completion: Completion) => {
      return {dom: node}
    }
    return completion
  }))
  console.log({request: "completion", completions, from, to, range: text.substring(from,to)})
  return {
      from: from,
      to: to,
      options: completions,
      filter: false
  } as CompletionResult
}

type Severity = "hint" | "info" | "warning" | "error";
function mapSeverity(t: be.HintType): Severity {
  switch(t) {
    case be.HintType.INFO:
      return "info"
    case be.HintType.WARNING:
      return "warning"
    case be.HintType.ERROR:
      return "error"
    default:
      console.warn(`Unknown hint severity "${t}", fallback to "info"`)
      return "info"
  }
}

async function requestHints(text: string): Promise<Diagnostic[]> {
  let hints = await be.requestHints(text)
  let diagnostics: Diagnostic[] = await Promise.all(hints.map(async (hint)=>{
    let msg = `${hint.name}: ${hint.brief}`.trim()
    let diag: Diagnostic = {
      from: hint.begin,
      to: hint.end,
      severity: mapSeverity(hint.type),
      source: "lsp",
      message: msg,
    }
    if (hint.doc != "") {
      let md = `${msg}\n\n${hint.doc}`.trim()
      let node = await renderMD(md)
      diag.renderMessage = (view: EditorView) => {
        return node
      }
    }
    return diag
  }))
  return diagnostics
}

export async function loadOAS(oas: string) {
  await be.loadOAS(oas)
}

export function http() {
  console.log("Initializing extension")
  let ext = [
      // client.of(options.client || new LanguageServerClient({...options, autoClose: true})),
      // documentUri.of('documetUri'),
      // languageId.of('http'),
      // ViewPlugin.define((view) => (plugin = new LanguageServerPlugin(view, options.allowHTMLContent))),
      hoverTooltip(
          async (view, pos) => {
            return await requestTooltip(view.state.doc.toString(), pos)
          }
      ),
      autocompletion({
          override: [
              async (context: CompletionContext) => {
                  const { state, pos, explicit } = context;
                  return await requestCompletion(state.doc.toString(), pos)
              }
          ]
      }),
      linter(async (view)=>{
        return await requestHints(view.state.doc.toString())
      })
  ];
  console.log(ext);
  return [
    new LanguageSupport(customHttpLanguage),
    syntaxHighlighting(defaultHighlightStyle),
    syntaxHighlighting(highlightOverride),
    ext
  ];
}