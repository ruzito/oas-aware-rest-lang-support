import Parser, {
  SyntaxNode,
  Tree,
  Point,
  Language,
  Query,
  QueryMatch,
} from "web-tree-sitter";

type QueryStorage = { [index: string]: Query };
const tsInitObj: {
  [name: string]: {
    lang: Language | null;
    parser: Parser | null;
    queries: QueryStorage;
  };
} = {};
let tsInitialized: boolean = false;

import tswasm from "tree-sitter.wasm";
import json_parser_wasm from "tree-sitter-json.wasm";
import http_parser_wasm from "tree-sitter-http.wasm";

async function initLangs(langs: { [name: string]: Uint8Array }): Promise<void> {
  for (let l in langs) {
    if (tsInitObj[l] === undefined) {
      tsInitObj[l] = { lang: null, parser: null, queries: {} };
    }
    if (tsInitObj[l].lang === null) {
      tsInitObj[l].lang = await Parser.Language.load(langs[l]);
    }
    if (tsInitObj[l].parser === null) {
      tsInitObj[l].parser = new Parser();
      tsInitObj[l].parser.setLanguage(tsInitObj[l].lang);
    }
  }
}

type Parsers = { json: Parser; http: Parser };

async function init(): Promise<void> {
  if (!tsInitialized) {
    // console.log("Initializing tree-sitter");
    await Parser.init({ wasmBinary: tswasm });
    await initLangs({
      json: json_parser_wasm,
      http: http_parser_wasm,
    });
    tsInitialized = true
  }
}

type TsInstance = {
  [name: string]: {
    lang: Language;
    parser: Parser;
    queries: QueryStorage;
  };
};
async function getTs(): Promise<TsInstance> {
  await init();
  return tsInitObj as TsInstance;
}

export async function getParsers(): Promise<Parsers> {
  const inst = await getTs();
  return { json: inst["json"].parser, http: inst["http"].parser };
}

async function getQuery(lang: string, q: string): Promise<Query> {
  const inst = await getTs();
  if (q in inst[lang].queries) {
    return inst[lang].queries[q];
  }
  // console.log("Creating query:", q)
  inst[lang].queries[q] = inst[lang].lang.query(q);
  return inst[lang].queries[q];
}

export async function getHttpQuery(q: string): Promise<Query> {
  return await getQuery("http", q);
}
export async function getJsonQuery(q: string): Promise<Query> {
  return await getQuery("json", q);
}

export function runQuery(n: SyntaxNode, q: Query): QueryMatch[] {
  if (n === null || n === undefined) {
    // console.error("Running query on nonexistant node:", n)
    return []
  }
  if (q === null || q === undefined) {
    // console.error("Running nonexistant query:", q)
    return []
  }

  // I have to add the filter capability
  // because when dealing with recursive structures
  // the query returns children that matches the query as well
  // I sometimes need to know if it is exact match
  // or if it is a child node that matched
  //
  // Therefore if I want an exact match, I just take a query `Q`
  // and make it a query `(Q) @__this__`
  //
  // since tree-sitter starts matching
  // from the argument node,
  // and the argument node is what the filter is matching against
  // it can only match if @__this__ capture is the top node in the query
  return q.matches(n).filter((m): boolean => {
    const thisCaptureIndex = m.captures.findIndex((c) => c.name === "__this__")
    if (thisCaptureIndex !== -1) {
      // console.log("a:", n.id, "===?", m.captures[thisCaptureIndex].node.id, "=>", n.id === m.captures[thisCaptureIndex].node.id, n, m.captures[thisCaptureIndex].node)
      return n.id === m.captures[thisCaptureIndex].node.id
    }
    // console.log("b:", !q.captureNames.includes("__this__"))
    return !q.captureNames.includes("__this__")
  })
}

export function debug(msg: string, root: SyntaxNode | null | undefined): void {
  console.log(
    msg,
    `[${root?.type}]`,
    `${root?.text.replace(/\n/g, "\\n")}`,
    root
  );
}

type NodeIterator = Generator<SyntaxNode>;

export function* children(node: SyntaxNode): NodeIterator {
  const cnt = node.childCount;
  for (let i = 0; i < cnt; i++) {
    const child = node.child(i);
    if (child !== null) {
      yield child;
    }
  }
}

export function* successors(node: SyntaxNode): NodeIterator {
  for (const child of node.children) {
    yield child;
    yield* successors(child);
  }
}

export function* predecessors(
  root: SyntaxNode,
  includeSelf: boolean = false,
  stopAt: SyntaxNode | null = null
): NodeIterator {
  if (stopAt !== null && root.id === stopAt.id) return;
  if (includeSelf) {
    // console.log("yield root", root.type, root.id)
    yield root
  };

  let node = root.parent;
  while (node !== null) {
    if (stopAt !== null && node.id === stopAt.id) {
      break;
    }
    // console.log("yield node", node.type, node.id)
    yield node;
    node = node.parent;
  }
}

export function* named(
  iter: NodeIterator,
  name: string[] | string | null = null
): NodeIterator {
  for (let node of iter) {
    // if (!node.isNamed) console.log("not named");
    if (!node.isNamed) continue;
    // if (typeof(name) === "string" && node.type !== name) console.log("does not match name");
    if (typeof(name) === "string" && node.type !== name) continue;
    // if (Array.isArray(name)) console.log("includes", name, "?",name.includes(node.type));
    if (Array.isArray(name) && !name.includes(node.type)) continue;
    // console.log("yield")
    yield node;
  }
}
export function* errors(
  iter: NodeIterator,
  name: string | null = null
): NodeIterator {
  for (let node of iter) {
    if (!node.isError && !node.isMissing) continue;
    yield node;
  }
}

export function indexOf(
  node: SyntaxNode,
  collection: Iterable<SyntaxNode>
): number {
  let i = 0;
  for (const x of collection) {
    if (node.id === x.id) {
      return i;
    }
    i++;
  }
  return -1;
}

export function namedNodeQuery(
  root: SyntaxNode,
  q: Array<{ i: number; name: string }>
): SyntaxNode | null {
  let node = root;
  for (let cond of q) {
    let i = cond.i;
    if (i < 0) {
      i = node.namedChildCount + cond.i;
    }
    if (i < 0 || node.namedChildCount <= i) {
      // console.log("named query: Index out of range", cond.i, "aka", i);
      return null;
    }
    const target = node.namedChildren[i];
    if (target.type !== cond.name) {
      // console.log(
      //   "named query: type does not match - expected:",
      //   cond.name,
      //   "got:",
      //   target.type
      // );
      return null;
    }
    node = target;
  }
  return node;
}
export function nodeQuery(
  root: SyntaxNode,
  q: Array<{ i: number; name: string }>
): SyntaxNode | null {
  let node = root;
  for (let cond of q) {
    let i = cond.i;
    if (i < 0) {
      i = node.childCount + cond.i;
    }
    if (i < 0 || node.childCount <= i) {
      // console.log("named query: Index out of range", cond.i, "aka", i);
      return null;
    }
    const target = node.children[i];
    if (target.type !== cond.name) {
      // console.log(
      //   "named query: type does not match - expected:",
      //   cond.name,
      //   "got:",
      //   target.type
      // );
      return null;
    }
    node = target;
  }
  return node;
}

type NodePattern = {
  type?: string | "__this__";
  parent?: NodePattern;
  children?: NodePattern[];
};

type NodePatternInternal = {
  root: SyntaxNode;
  type?: string | "__this__";
  parent?: NodePatternInternal;
  children: NodePatternInternal[];
};

export function printNode(
  node: SyntaxNode | null,
  named: boolean,
  positions: boolean,
  indent: number = 0
) {
  if (node === null) {
    return `\n`;
  }
  const metaLabels = [
    ["named", node.isNamed && !named],
    ["extra", node.isExtra],
    ["token", node.type === node.text],
  ]
    .filter(([_, condition]) => condition)
    .map(([label, _]) => label)
    .join("|");

  const nameOverrides: { [key: string]: string } = {
    " ": "<SPACE>",
    "\n": "<NEWLINE>",
    ":": "<COLON>",
    "{": "<BRACKET_OPEN>",
    "}": "<BRACKET_CLOSE>",
    ",": "<COMMA>",
    '"': "<QUOTE>",
  };

  const nodeName = nameOverrides[node.type] ?? node.type;
  const nodeMeta = metaLabels === "" ? "" : ` (${metaLabels})`;
  const nodeText = node.text.replace(/\n/g, "\\n").trim();
  const nodePosition = !positions
    ? ""
    : ` [${node.startIndex}..${node.endIndex} = (R${node.startPosition.row},C${node.startPosition.column})..(R${node.endPosition.row},C${node.endPosition.column})]`;
  const indentString = "  ".repeat(indent);

  let result = `${indentString}- ${nodeName}${nodeMeta}: |${nodeText}|${nodePosition}\n`;

  const cnt = named ? node.namedChildCount : node.childCount;
  const child = named ? node.namedChild.bind(node) : node.child.bind(node);

  // Recursively process child nodes
  for (let i = 0; i < cnt; i++) {
    result += printNode(child(i), named, positions, indent + 1);
  }
  return result;
}

export function printTree(
  t: Tree,
  named: boolean = true,
  positions: boolean = false
): string {
  return printNode(t.rootNode, named, positions);
}
