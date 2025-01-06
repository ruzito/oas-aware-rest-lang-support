import * as specLoader from "./oas-wrapper.js"

import * as mockApi from "./mock_api.js"
import * as completions from "./completions.js"
import * as hints from "./hints.js"

import { CompletionType, HintType, Markdown, Completion, Hint, OasContext } from "./types.js"

export const initOasContext = specLoader.initOasContext
export const parseOas = specLoader.loadOas
export const fetchOas = specLoader.loadUrl

export const requestDocs = mockApi.requestDocs
export const requestCompletions = completions.requestCompletions

export const requestHints = hints.requestHints

export const OasFormat = specLoader.OasFormat

export { CompletionType, HintType }
export type { Markdown, Completion, Hint, OasContext }