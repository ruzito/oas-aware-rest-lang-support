import Parser, {
  SyntaxNode,
  Point,
  Tree,
  Query,
  QueryCapture,
  QueryMatch,
  QueryOptions,
  Language,
} from "web-tree-sitter";

import { HTTP_SEPARATOR } from "./constants.js";
import {
  named,
  children,
  predecessors,
  debug,
  printTree,
  indexOf,
  namedNodeQuery,
  nodeQuery,
  getParsers,
  getJsonQuery,
  getHttpQuery,
  runQuery,
  successors,
} from "./treesitter-wrapper.js";
import { exposeDebug, reversed, reduce, PlainObject } from "./utils.js";

enum context_part {
  METHOD,
  PATH,
  HEADER,
  BODY,
}
enum context_type {
  KEY,
  VALUE,
}
// type cursor_context: (context_type, )
// type request_body_context = {complete: object, completePath: Path, cursorIn: cursor_context}

type cursor_part = "METHOD" | "PATH" | "HEADER" | "BODY";

type cursor = { part: cursor_part };

type method_cursor = { part: "METHOD"; offset: number };

enum section_type {
  METHOD,
  PATH,
  HEADERS,
  BODY,
}

enum tag_type {
  METHOD,
  PATH_PART,
  HEADER_KEY,
  HEADER_SEPARATOR,
  HEADER_VALUE,
  BODY_KEY,
  BODY_VALUE,
}

type tag = {
  tag: tag_type;
  section: section_type;
  beginOffset: number;
  endOffset: number;
};

const sepRegex = new RegExp(`^${HTTP_SEPARATOR}{3}${HTTP_SEPARATOR}*$`);

function splitByIndices(s: string, indices: Array<number>): Array<string> {
  const iterIndicies = [0, ...indices];
  const fullIndicies = [0, ...indices, s.length];
  return iterIndicies.map((e, i) => s.slice(e, fullIndicies[i + 1]));
}

function getParts(
  req: string
): { httpPart: string; separatorPart: string; jsonPart: string } | null {
  let acc = 0;
  const lines: Array<{ line: number; beginOffset: number; text: string }> = req
    .split("\n")
    .map((l, i) => {
      const res = { line: i, beginOffset: acc, text: l };
      acc += l.length + 1;
      return res;
    });
  for (let line of lines) {
    if (sepRegex.test(line.text)) {
      const parts = splitByIndices(req, [
        line.beginOffset,
        line.beginOffset + line.text.length + 1,
      ]);
      return {
        httpPart: parts[0],
        separatorPart: parts[1],
        jsonPart: parts[2],
      };
    }
  }
  return null;
}

function soft_assert(cond: boolean, text: string) {
  if (!cond) {
    const msg = `ASSERTION ERROR: ${text}`;
    console.error(msg);
    if (alert !== undefined) {
      alert(msg);
    }
    return true;
  }
  return false;
}

export async function parse(req: string): Promise<{
  http: Parser.Tree;
  json: Parser.Tree;
  jsonBegin: number;
  httpText: string;
  jsonText: string;
} | null> {
  const parts = getParts(req);
  if (parts === null) {
    // no separator found
    // soft_assert(false, "No separator found")
    return null;
  }

  let { httpPart, jsonPart, separatorPart } = parts;
  if (
    soft_assert(
      httpPart.length + jsonPart.length + separatorPart.length == req.length,
      `invalid parts split: ${httpPart.length} + ${jsonPart.length} + ${separatorPart.length} != ${req.length}`
    )
  ) {
    return null;
  }
  // console.log("HTTP Part", httpPart);
  // console.log("JSON Part", jsonPart);

  const { json: jsonParser, http: httpParser } = await getParsers();
  const httpTree = httpParser.parse(httpPart);
  const jsonTree = jsonParser.parse(jsonPart);

  // console.log("HTTP Tree", httpTree);
  // console.log("HTTP Tree", printTree(httpTree))

  // console.log("JSON Tree", jsonTree);
  // console.log("JSON Tree", printTree(jsonTree))

  return {
    json: jsonTree,
    http: httpTree,
    jsonBegin: httpPart.length + separatorPart.length,
    httpText: httpPart,
    jsonText: jsonPart,
  };
}

// If node is a value entry in an object
//    returns the key if possible
// returns null if node should be ignored
// returns undefined if key was expected but was not recognized
//
//  {"a": <node>} => returns "a"
function getValueKey(node: SyntaxNode): string | null | undefined {
  // if node does not have enough parents, it cannot be a value in an object
  if (node.parent === null) return null;
  if (node.parent.parent === null) return null;

  // value of an object is a node whose parents are pair and object
  if (node.parent.type !== "pair") return null;
  if (node.parent.parent.type !== "object") return null;

  // named children of a pair are the two values of the pair
  // key is the first child
  // value is the second child
  if (indexOf(node, named(children(node.parent))) !== 1) return null;

  // shape is correct, surely being nested
  // from now on return at least undefined

  // thanks to node being index 1 in named children of the parent
  // we know for sure there is at least named child 0
  // and it should be the key
  if (node.parent.namedChild(0)?.type !== "string") return undefined;

  const stringContents = node.parent.namedChild(0)?.namedChild(0);

  if (stringContents === null || stringContents === undefined) return undefined;
  if (stringContents.type !== "string_content") return undefined;

  return stringContents.text;
}

// function getValueKeyIfIncomplete(node: SyntaxNode)

// If node is an element of an array
//    returns the index
// otherwise returns null
function getArrayIndex(node: SyntaxNode): number | null {
  if (node.parent === null) return null;
  if (node.parent.type !== "array") return null;
  const i = indexOf(node, node.parent.namedChildren);
  return i === -1 ? null : i;
}

type EnumObject<T> = T[keyof T]

const CompletionKind = {
  OBJECT_KEY: "objectKey",
  OBJECT_VALUE: "objectValue",
  ARRAY_ELEMENT: "arrayElement",
  ROOT_VALUE: "root",
  UNKNOWN: "unknown"
} as const;

type CompletionKind = EnumObject<typeof CompletionKind>

type JPathTail = { kind: CompletionKind, hint: string, range: {beginOffset: number, endOffset: number} };
type JPathBody = Array<string | number | undefined>;

type JPath = { path: JPathBody; tail: JPathTail };
type JPathDebug = JPath & { debug?: PlainObject };

// function isKey(root: SyntaxNode): boolean {
//   let node = root;
//   if (node.type === "string_content") {
//     if (node.parent === null) return false;
//     node = node.parent;
//   }
//   if (node.type !== "string") return false;
//   if (node.parent === null) return false;
//   if (node.parent.type !== "pair") return false;
//   return indexOf(node, node.parent.namedChildren) === 0;
// }

function getPairIndexBasedOnOffset(obj: SyntaxNode, offset: number): number {
  if (obj.type !== "object") {
    console.error("Unreachable 3");
  }

  //   ,-- Don't care about previous colon here
  //  |   ,-- I do care here tho
  // v   v
  // 0 1 1   2   3   4   5 <---- and I still care here
  // |aaa|bbb|ccc|ddd|eee|

  let i = 0;
  for (const pair of named(children(obj), "pair")) {
    if (pair.startIndex >= offset) {
      return i;
    }
    if (pair.startIndex > offset && pair.endIndex < offset) {
      console.warn("Dont know why would you want to be here")
      return i;
    }
    i++;
  }
  return i;
}

async function previousPairHasEnded(
  obj: SyntaxNode,
  pairIndex: number,
  offset: number
): Promise<boolean> {
  if (obj.type !== "object") {
    console.error("Unreachable 4");
  }
  const prePair = obj.namedChild(pairIndex - 1);
  if (prePair === null) {
    console.error("Unreachable 5");
    return true;
  }
  const endOfPrePair = prePair.endIndex;
  const commaQuery = await getJsonQuery('(",") @comma');
  const qRes = runQuery(obj, commaQuery);
  let result = false; // is there a comma between previous pair's end and `offset` in an object
  for (let match of qRes) {
    for (let com of match.captures) {
      if (
        com.name === "comma" &&
        com.node.startIndex >= endOfPrePair &&
        com.node.endIndex <= offset
      ) {
        result = true;
      }
    }
  }

  return result;
}
async function previousPairHasSeparator(
  obj: SyntaxNode,
  pairIndex: number,
  offset: number
): Promise<boolean> {
  if (obj.type !== "object") {
    console.error("Unreachable 6");
  }
  const prePair = obj.namedChild(pairIndex - 1);
  if (prePair === null) {
    console.error("Unreachable 7");
    return true;
  }
  const endOfPrePair = prePair.endIndex;
  const colonQuery = await getJsonQuery('(pair (":") @colon) @__this__');
  const qRes = runQuery(prePair, colonQuery);
  let result = false; // is there a colon in previous pair
  for (let match of qRes) {
    for (let com of match.captures) {
      if (com.name === "colon") {
        result = true;
      }
    }
  }

  return result;
}

function getCapture(matches: QueryMatch[], capturename: string) : SyntaxNode | undefined {
  for (const match of matches) {
    for (const capture of match.captures) {
      if (capture.name === capturename) {
        return capture.node
      }
    }
  }
  return undefined
}

export async function getJPath(jsonTree: Tree, offset: number): Promise<JPath> {
  const debug: PlainObject = {};
  console.log("Constructing JPATH");
  // This should get us the named node directly at cursor (the most nested one)
  const node = jsonTree.rootNode.namedDescendantForIndex(offset);
  debug["nodeAtIndex"] = node;
  let hint: string = "";
  // Now I want to figure out what container is directly above me
  let immContainerParent: SyntaxNode | null;
  {
    const excludeSelf = offset <= node.startIndex;
    debug["excludeSelf"] = excludeSelf;
    const p = named(predecessors(node, !excludeSelf), [
      "array",
      "object",
    ]).next();
    if (p.done) {
      immContainerParent = null;
    } else {
      immContainerParent = p.value;
    }
  }
  exposeDebug({
    query: async (n: SyntaxNode, q: string) =>
      runQuery(n, await getJsonQuery(q)),
    node,
    immContainerParent,
  });
  if (immContainerParent === null) {
    let r: JPathDebug = {
      path: [],
      tail: { kind: CompletionKind.ROOT_VALUE, hint: "", range: {beginOffset: offset, endOffset: offset}},
      debug: debug
    };
    return r as JPath; 
  }
  debug["immCont"] = immContainerParent;
  // Now figure out the path to that container above me
  const namedPredecessors = Array.from(
    named(predecessors(immContainerParent, true))
  );
  const tail: Partial<JPathTail> = {hint: ""};
  const jpath: JPathBody = reduce(
    reversed(namedPredecessors),
    (acc: Array<string | number | undefined>, cur: SyntaxNode) => {
      // console.log({id: cur.id, name: cur.type, cur})
      const parent = cur.parent;
      if (parent) {
      }
      const k = getValueKey(cur);
      if (k !== null) {
        tail["kind"] = CompletionKind.OBJECT_VALUE;
        return [...acc, k];
      }
      const i = getArrayIndex(cur);
      if (i !== null) {
        tail["kind"] = CompletionKind.ARRAY_ELEMENT;
        return [...acc, i];
      }
      return acc;
    },
    []
  );

  // Now the hard part
  //
  // - Figure out the precise location of the cursor in possibly incomplete JSON
  // - Push additional path segmens
  // - Set the completion goal correctly

  // prepare some tree-sitter queries
  const fullPairQuery = await getJsonQuery(
    '(object (pair key: (string (string_content) @key) (":") @separator value: (_)? @value) ) @__this__'
  );
  const keyPairQuery = await getJsonQuery(
    "(object (pair key: (string (string_content) @key) . ) ) @__this__"
  );
  const pairSeparator = await getJsonQuery('(pair (":") @sep ) @__this__');
  const pairInspect = await getJsonQuery(
    "(pair key: (string (string_content) @keyname)? @keynode value: (_)? @value ) @__this__"
  );
  function setKeyHint(tail: Partial<JPathTail>, pair: SyntaxNode) {
    const capture = getCapture(runQuery(pair, pairInspect), "keyname")
    if (capture) {
      tail.hint = capture.text;
    }
    else {
      tail.hint = ""
    }
  }
  function setValueRange(tail: Partial<JPathTail>, pair: SyntaxNode, fallbackOffset: number) {
    const capture = getCapture(runQuery(pair, pairInspect), "value")
    if (capture) {
      if (capture.isMissing) {
        tail.range = {
          beginOffset: fallbackOffset,
          endOffset: fallbackOffset
        }
      }
      else {
        tail.range = {
          beginOffset: capture.startIndex,
          endOffset: capture.endIndex
        };
      }
    }
  }
  // Let's do WET instead of DRY here ... I have a feeling, these might diverge in the future
  function setKeyRange(tail: Partial<JPathTail>, pair: SyntaxNode, fallbackOffset: number) {
    const capture = getCapture(runQuery(pair, pairInspect), "keynode")
    if (capture) {
      if (capture.isMissing) {
        tail.range = {
          beginOffset: fallbackOffset,
          endOffset: fallbackOffset
        }
      }
      else {
        tail.range = {
          beginOffset: capture.startIndex,
          endOffset: capture.endIndex
        };
      }
    }
  }

  // I am very sorry, but I could not figure out
  // how to do it better without exhausting all the possibilities
  if (immContainerParent.type === "object") {
    const p = named(predecessors(node, true), ["pair", "object"]).next();

    if (!p.done && p.value.type === "pair") {
      // we are inside of pair `p`
      if (p.value.hasError) {
        // possibly do something else
        console.warn("I dunno if what this changes yet");
      }

      // check if we are left or right of the separator
      const pairSeparatorResult = runQuery(p.value, pairSeparator);

      let left = undefined;
      // I'm fighting typescript here a bit
      // The constant feedback loop:
      //   - is it there? if no: "left"
      //   - is it there? if no: "left"
      // while every time nesting myself
      // more and more into the object structure
      // while trying to tell the typesystem that
      // because of the checks I know it's not undefined
      // but still having to skip the nesting after it is known to be "left"
      //
      // I just made this goto thing, sorry
      do {
        if (pairSeparatorResult.length === 0) {
          left = true;
          debug["why"] = "Left A";
          break;
        }
        const match = pairSeparatorResult.at(0) as QueryMatch;
        if (match.captures.length === 0) {
          left = true;
          debug["why"] = "Left B";
          break;
        }
        const cap = match.captures;
        const sep = cap.filter((c) => c.name === "sep").at(0)?.node as SyntaxNode;
        if (sep.type !== ":") {
          debug["why"] = "Left C";
          left = true;
          break;
        }
        if (offset <= sep.startIndex) {
          left = true;
          debug["why"] = "Left D";
          break;
        }

        left = false;
      } while (false);

      if (left) {
        // we are left of the separator
        // request completion of object keys
        setKeyHint(tail, p.value)
        setKeyRange(tail, p.value, offset)
        tail.kind = CompletionKind.OBJECT_KEY;
      }
      else {
        // we are right of the separator
        // request completion of object value
        // and add the key to the path
        tail.kind = CompletionKind.OBJECT_VALUE;
        tail.hint = "TODO: Value hint"
        debug["why"] = "Right";
        setValueRange(tail, p.value, offset);
        const k = p.value.childForFieldName("key");
        if (k === null) {
          jpath.push(undefined);
        } else {
          const kstr = k.namedChild(0);
          jpath.push(kstr === null ? undefined : kstr.text);
        }
      }
    } else {
      // we are in between pairs
      const i = getPairIndexBasedOnOffset(immContainerParent, offset);
      const ithPair = immContainerParent.namedChildren[i]
      debug["prevIndex"] = i
      if (i === 0) {
        tail.kind = CompletionKind.OBJECT_KEY;
        setKeyHint(tail, ithPair)
        setKeyRange(tail, ithPair, offset)
        console.log(">>>", tail.hint)
        debug["why"] = "First";
      } else {
        // check previous pair if we still need to complete that one
        if (await previousPairHasEnded(immContainerParent, i, offset)) {
          // we are truly in between pairs
          tail.kind = CompletionKind.OBJECT_KEY;
          tail.hint = "";
          debug["why"] = "After";
        } else if (
          await previousPairHasSeparator(immContainerParent, i, offset)
        ) {
          // we are completing last pairs value
          tail.kind = CompletionKind.OBJECT_VALUE;
          tail.hint = "TODO: Value hint"
          const prePair = immContainerParent.namedChild(i - 1) as SyntaxNode;
          const k = prePair.childForFieldName("key");
          if (k === null) {
            jpath.push(undefined);
          } else {
            const kstr = k.namedChild(0);
            jpath.push(kstr === null ? undefined : kstr.text);
          }
          setValueRange(tail, prePair, offset)
          debug["why"] = "Prev val";
        } /* previous pair doesn't have a separator */ else {
          // we are completing the key still???
          tail.kind = CompletionKind.OBJECT_KEY;
          debug["why"] = "Prev key";
        }
      }
    }
  } else if (immContainerParent.type === "array") {
    tail.kind = CompletionKind.ARRAY_ELEMENT;
    tail.hint = "TODO: Value hint"
    debug["why"] = "immArray";
  } else {
    debug["why"] = "WTF";
  }

  if (tail.kind === undefined || tail.kind === null) {
    console.error("tail.kind is", tail.kind)
  }

  let result: JPathDebug = { path: jpath, tail: {kind: tail.kind ?? CompletionKind.UNKNOWN, hint: tail.hint ?? "", range: tail.range ?? {beginOffset: offset, endOffset: offset}}, debug };
  // console.log(result)
  return result;
}
