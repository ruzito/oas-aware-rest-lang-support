import { autocompletion } from '@codemirror/autocomplete'
import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import type { Text } from '@codemirror/state';
import { EditorView, ViewPlugin, Tooltip, hoverTooltip } from '@codemirror/view';
import { parser } from './http_parser';
import { LRLanguage, LanguageSupport, HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { jsonLanguage } from '@codemirror/lang-json';
import { parseMixed } from '@lezer/common';
import {styleTags, tags} from "@lezer/highlight"
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt();


type Position = { line: number; character: number }

function offsetToPos(doc: Text, offset: number): Position {
    const line = doc.lineAt(offset);
    return {
        line: line.number - 1,
        character: offset - line.from,
    };
}
// const useLast = (values: readonly any[]) => values.reduce((_, v) => v, '');
// const client = Facet.define<LanguageServerClient, LanguageServerClient>({ combine: useLast });
// const documentUri = Facet.define<string, string>({ combine: useLast });
// const languageId = Facet.define<string, string>({ combine: useLast });


// @highlight {
//   Method [keyword]
//   Path [url]
//   Version [variableName]
//   HeaderKey [propertyName]
//   HeaderValue [string]
// }


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

const myHighlightStyle = HighlightStyle.define([
  {tag: tags.propertyName, color: "#05c"},
  // {tag: tags.url, color: "#fc6"},
  // {tag: tags.keyword, color: "#fc6"},
  // {tag: tags.variableName, color: "#fc6"},
  // {tag: tags.string, color: "#fc6"},
  // {tag: tags.number, color: "#fc6"},
])


// import { HighlightStyle, tags } from '@codemirror/language';

// export const customHttpHighlightStyle = HighlightStyle.define([
//   { tag: tags.keyword, color: '#0000FF' }, // HTTP methods
//   { tag: tags.string, color: '#A31515' },  // Header values
//   { tag: tags.variableName, color: '#001080' }, // Paths
//   // Add more styles as needed
// ]);
/**
 * Export a language support extension for CodeMirror.
 */

let doc_md = `
# Doc markdown
<h1>what</h1>
what is this
`.trim()

async function render_md(md_str: string): Promise<HTMLElement> {
  let dom = document.createElement('div');
  dom.innerHTML = md.render(md_str);
  return dom
}

async function request_tooltip(text: string, offset: number): Promise<Tooltip | readonly Tooltip[] | null> {
  console.log({request: "tooltip", text, offset})
  let dom = await render_md(doc_md)
  return {
    "pos": offset,
    "create": (view: EditorView) => {return {dom}}
  }
}

async function request_completion(text: string, offset: number): Promise<CompletionResult | null> {
  console.log({request: "completion", text, offset})
  let completions: Completion[] = []
  let types = [
    "class",
    "constant",
    "enum",
    "function",
    "interface",
    "keyword",
    "method",
    "namespace",
    "property",
    "text",
    "type",
    "variable"
  ]
  for (let type of types) {
    const completion: Completion = {
      label: "label",
      detail: `brief: ${type}`,
      apply: "the resulting source to be replaces/applied",
      type: type
    };
    let node = await render_md(`${doc_md}\ncompletion.info from ${offset}`)
    completion.info = (completion: Completion) => {
      return {dom: node}
    }
    completions.push(completion)
  }
  return {
      from: offset,
      options: completions,
  } as CompletionResult
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
            return await request_tooltip(view.state.doc.toString(), pos)
          }
      ),
      autocompletion({
          override: [
              async (context: CompletionContext) => {
                  const { state, pos, explicit } = context;
                  return await request_completion(state.doc.toString(), pos)
              }
          ]
      })
  ];
  console.log(ext);
  return [
    new LanguageSupport(customHttpLanguage),
    syntaxHighlighting(defaultHighlightStyle),
    syntaxHighlighting(myHighlightStyle),
    ext
  ];
}