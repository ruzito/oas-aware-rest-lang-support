// This file is just a stub for 'tree-sitter-http.wasm' import
// so that tsc ignores that import
// so that esbuild can replace it with static asset

declare module "tree-sitter-grammar.wasm" {
    const wasmBase64: Uint8Array;
    export default wasmBase64;
}
declare module "tree-sitter-json.wasm" {
    const wasmBase64: Uint8Array;
    export default wasmBase64;
}
declare module "tree-sitter-http.wasm" {
    const wasmBase64: Uint8Array;
    export default wasmBase64;
}