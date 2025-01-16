import { autocompletion } from '@codemirror/autocomplete'
import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import { EditorView, PluginValue, Tooltip, ViewPlugin, hoverTooltip } from '@codemirror/view';
import { parser } from './http_parser';
import { LRLanguage, LanguageSupport, HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { jsonLanguage, json as jsonExtension } from '@codemirror/lang-json';
import { parseMixed } from '@lezer/common';
import { tags } from "@lezer/highlight"
import { linter, Diagnostic, LintSource } from "@codemirror/lint"

import * as be from '@ruzito/oas-ls-backend';

import MarkdownIt from 'markdown-it';
import { Extension } from '@codemirror/state';
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
  { tag: tags.propertyName, color: "#05c" },
])


async function renderMD(md_str: string): Promise<HTMLElement> {
  let dom = document.createElement('div');
  dom.innerHTML = md.render(md_str);
  return dom
}

async function requestTooltip(ctx: be.OasContext, text: string, offset: number): Promise<Tooltip | null> {
  return null // TODO: implement
  let docs = await be.requestDocs(text, offset, ctx)
  let dom = await renderMD(docs)
  return {
    "pos": offset,
    "create": (view: EditorView) => { return { dom } }
  }
}

function mapCompletionType(t: be.CompletionType): string {
  switch (t) {
    case be.CompletionType.DUMMY_TYPE:
      console.warn(`Dummy completion type, fallback to "text"`)
      return "text"
    case be.CompletionType.OBJECT_KEY:
      return "property"
    case be.CompletionType.VALUE:
      return "type"
    case be.CompletionType.METHOD:
      return "function"
    case be.CompletionType.PATH:
      return "namespace"
    default:
      console.warn(`Unknown completion type "${t}", fallback to "function"`)
      return "enum"
  }
}

async function requestCompletion(ctx: be.OasContext, text: string, offset: number, minOffset: number = 0): Promise<CompletionResult | null> {
  // console.log({ request: "completion", text, offset })
  let from = offset
  let to = offset
  let completions: Completion[] = await Promise.all((await be.requestCompletions(text, offset, ctx)).filter((comp) => {
    if (offset < comp.begin || offset > comp.end)
      return false
    if (offset < minOffset)
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
    if (comp.doc && comp.doc !== "") {
      let node = await renderMD(comp.doc)
      completion.info = (completion: Completion) => {
        return { dom: node }
      }
    }
    return completion
  }))
  // console.log({ request: "completion", completions, from, to, range: text.substring(from, to) })
  return {
    from: from,
    to: to,
    options: completions,
    filter: false
  } as CompletionResult
}

type Severity = "hint" | "info" | "warning" | "error";
function mapSeverity(t: be.HintType): Severity {
  switch (t) {
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

async function requestHints(ctx: be.OasContext, text: string): Promise<Diagnostic[]> {
  let hints = await be.requestHints(text, ctx)
  let diagnostics: Diagnostic[] = await Promise.all(hints.map(async (hint) => {
    let msg = `${hint.name}: ${hint.brief}`.trim()
    let diag: Diagnostic = {
      from: hint.begin,
      to: hint.end,
      severity: mapSeverity(hint.type),
      source: "lsp",
      message: msg,
    }
    if (hint.doc && hint.doc !== "") {
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

export const parseOas = be.parseOas
export const fetchOas = be.fetchOas
export const initOasContext = be.initOasContext

function buildHttpMeta(meta: HttpData): string {
  const headers = meta.headers.map((x) => { return `${x.key}: ${x.value}` }).join('\n')
  return `${meta.method} ${meta.path} HTTP/1.1\n${headers}\n\n---\n\n`
}

function bodyOnlyHints(diagnostics: Diagnostic[], httpPart: string): Diagnostic[] {
  return diagnostics.filter((d)=>{return d.from >= httpPart.length}).map((d) => { d.from -= httpPart.length; d.to -= httpPart.length; return d })
}

// let metaStorage: string = buildHttpMeta({ method: "GET", path: "/", headers: [{ key: "Content-Type", value: "application/json" }] })

function linterWrapper() {
  let view_ : EditorView | null = null
  let plugin_: (PluginValue & {force: ()=>void, set: boolean }) | null = null
  let lintPlugin_: ViewPlugin<{force: ()=>void, set: boolean }> | null = null
  let extensionsFromLinter_: Extension[] = []
  let cronJobId_: any | null = null

  function forceLinting() {
    if (view_ === null || lintPlugin_ === null) {
      console.warn("still don't have `view_`")
      return;
    }
    if (extensionsFromLinter_.length == 0) {
      console.warn("still don't have extensions list")
      return;
    }
    if (lintPlugin_ === null) {
      for (let ex of extensionsFromLinter_) {
        if (ex instanceof ViewPlugin) {
          const plugin = view_.plugin(ex);
          if (plugin && plugin.set !== undefined && plugin.force !== undefined) {
            lintPlugin_ = ex
            plugin_ = plugin
          }
        }
      }
    }
    if (plugin_ === null) {
      console.warn("still didn't find the plugin")
      return;
    }
    plugin_.set = true;
    plugin_.force();
    // const plugin = view_.plugin(lintPlugin_);
    // if (plugin) {
    //   plugin.set = true;
    //   plugin.force();
    // }
  }
  function linterInjection(linterSource: LintSource): LintSource{
    return async (view: EditorView): Promise<readonly Diagnostic[]> => {
      if (view_ === null) {
        view_ = view
      }
      return await linterSource(view)
    }
  }

  function createLinterPlugin(linterSource: LintSource) {
    extensionsFromLinter_ = [linter(linterInjection(linterSource))].flat()
    return extensionsFromLinter_
  }

  function stopLinting() {
    if (cronJobId_ !== null) {
      clearInterval(cronJobId_)
    }
  }

  function startLinting() {
    cronJobId_ = setInterval(() => {
      forceLinting()
    }, 2000)
  }

  return {createLinterPlugin, startLinting, stopLinting}
}

export type HttpData = { method: string, path: string, headers: Array<{ key: string, value: string }> }
export function json(ctx: be.OasContext, metaProvider: () => Promise<HttpData>) {
  // let wrapper = linterWrapper()
  let ext = [
    hoverTooltip(
      async (view, pos) => {
        const httpPart = buildHttpMeta(await metaProvider());
        return await requestTooltip(ctx, httpPart + view.state.doc.toString(), pos + httpPart.length)
      }
    ),
    autocompletion({
      override: [
        async (context: CompletionContext) => {
          const httpPart = buildHttpMeta(await metaProvider());
          const { state, pos, explicit } = context;
          let completions = await requestCompletion(ctx, httpPart + state.doc.toString(), pos + httpPart.length, httpPart.length)
          if (completions !== null) {
            completions.from -= httpPart.length
            if (completions.to !== null && completions.to !== undefined) {
              completions.to -= httpPart.length
            }
          }
          return completions
        }
      ]
    }),
    // wrapper.createLinterPlugin(async (view) => {
    //   let hints = await requestHints(ctx, metaStorage + view.state.doc.toString())
    //   return bodyOnlyHints(hints)
    // }),
    linter(async (view) => {
      const httpPart = buildHttpMeta(await metaProvider());
      let hints = await requestHints(ctx, httpPart + view.state.doc.toString())
      return bodyOnlyHints(hints, httpPart)
    })
  ];
  return [ext, jsonExtension()]
}
export function http(ctx: be.OasContext) {
  // console.log("Initializing extension")
  let ext = [
    hoverTooltip(
      async (view, pos) => {
        return await requestTooltip(ctx, view.state.doc.toString(), pos)
      }
    ),
    autocompletion({
      override: [
        async (context: CompletionContext) => {
          const { state, pos, explicit } = context;
          return await requestCompletion(ctx, state.doc.toString(), pos)
        }
      ]
    }),
    linter(async (view) => {
      return await requestHints(ctx, view.state.doc.toString())
    })
  ];
  // console.log(ext);
  return [
    ext,
    new LanguageSupport(customHttpLanguage),
    syntaxHighlighting(defaultHighlightStyle),
    syntaxHighlighting(highlightOverride),
  ];
}