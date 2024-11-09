import { parse as parseYAML } from "yaml";

// import { Ok, Err } from "./result"
// import Result from "./result"

import * as util from "./utils.js"

type OASSpec = util.PlainObject | null

// null => could not fetch
let oasRoot: OASSpec = null
let oasExternalRefs: { [url: string]: OASSpec } = {}

export enum OASFormat {
    YAML = "YAML",
    JSON = "JSON"
}

async function parseOAS(spec: string, format: OASFormat): Promise<OASSpec> {
    let pojo: util.PlainObject = {}
    let tryList = [(x: string) => JSON.parse(x), (x: string) => parseYAML(x)]
    if (format === OASFormat.YAML) {
        tryList = [parseYAML, JSON.parse]
    }
    let success = false
    for (let parser of tryList) {
        try {
            pojo = parser(spec)
            success = true
            break
        }
        catch { }
    }
    if (success == false || !util.isPlainObject(pojo)) {
        console.warn("Could not parse specification", spec)
        return null
    }
    return pojo
}

async function fetchOAS(url: string): Promise<OASSpec> {
    if (url in oasExternalRefs) {
        return oasExternalRefs[url]
    }
    oasExternalRefs[url] = null
    let contentType: string | null = null
    let spec: string

    // fetch spec
    try {
        let response = await fetch(url)
        if (!response.ok) {
            console.warn(`Could not fetch OAS (status ${response.status}) from \`${url}\``)
            return null
        }
        contentType = response.headers.get("content-type");
        spec = await response.text()
        if (spec === null) {
            console.warn(`Could not fetch OAS (empty body) from \`${url}\``)
            return null
        }
    }
    catch (err) {
        console.warn(`Could not fetch OAS (unkown error) from \`${url}\`\n${err}`)
        return null
    }

    // Guess format
    let format = OASFormat.JSON
    if (typeof contentType === "string" && (contentType.includes("yml") || contentType.includes("yaml"))) {
        format = OASFormat.YAML
    }

    // parse to json
    let pojo = await parseOAS(spec, format)
    oasExternalRefs[url] = pojo

    // recurse through ref URLs
    await dereferenceURLs(pojo)
    return pojo
}

async function dereferenceURLs(pojoOAS: OASSpec) {
    await util.traverseAsync(pojoOAS, async (path: util.Path, url: util.Scalar) => {
        if (path[path.length - 1] !== '$ref') return
        if (typeof url !== "string") return
        if (!url.startsWith('http://') && !url.startsWith('https://')) return
        if (url in oasExternalRefs) return

        let pojo = await fetchOAS(url)
        oasExternalRefs[url] = pojo
    })
}

export async function loadOAS(oas: string, format: OASFormat = OASFormat.JSON): Promise<void> {
    const pojo = await parseOAS(oas, format)
    await dereferenceURLs(pojo)
    oasRoot = pojo
    if (oasRoot === null) {
        throw new Error(`Could not parse OAS specification\n${oas}`)
    }
    console.log({ "root": oasRoot })
    console.log({ "externalRefs": oasExternalRefs })
}

export async function loadURL(url: string): Promise<void> {
    const root = await fetchOAS(url)
    oasRoot = root
    if (oasRoot === null) {
        throw new Error(`Could not fetch OAS specification \`${url}\``)
    }
    console.log({ "root": oasRoot })
    console.log({ "externalRefs": oasExternalRefs })
}

export function ready(): boolean {
    return oasRoot !== null
}

export function getRoot(): OASSpec {
    return oasRoot
}

export function getRemote(url: string): OASSpec {
    if (url in oasExternalRefs) {
        return oasExternalRefs[url]
    }
    else {
        return null
    }
}