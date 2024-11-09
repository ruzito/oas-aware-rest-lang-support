import * as specLoader from "./spec_loader.js"

import * as mockApi from "./mock_api.js"
import * as completions from "./completions.js"

import { CompletionType, HintType, Markdown, Completion, Hint } from "./types.js"

export const parseOas = specLoader.loadOAS
export const fetchOas = specLoader.loadURL

export const requestDocs = mockApi.requestDocs
export const requestCompletions = completions.requestCompletions

export const requestHints = mockApi.requestHints

export { CompletionType, HintType }
export type { Markdown, Completion, Hint }