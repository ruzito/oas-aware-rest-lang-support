// This file is just a stub for 'tree-sitter.wasm' import
// so that tsc ignores that import
// so that esbuild can replace it with static asset

declare module "tree-sitter.wasm" {
    const wasmBase64: Uint8Array;
    export default wasmBase64;
}