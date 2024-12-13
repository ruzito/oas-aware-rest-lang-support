import * as specLoader from "./spec_loader.js"

import * as mockApi from "./mock_api.js"
import * as completions from "./completions.js"
import * as hints from "./hints.js"

import { CompletionType, HintType, Markdown, Completion, Hint, OasContext } from "./types.js"

export const initOasContext = specLoader.initOasContext
export const parseOas = specLoader.loadOAS
export const fetchOas = specLoader.loadURL

export const requestDocs = mockApi.requestDocs
export const requestCompletions = completions.requestCompletions

export const requestHints = hints.requestHints

export { CompletionType, HintType }
export type { Markdown, Completion, Hint, OasContext }