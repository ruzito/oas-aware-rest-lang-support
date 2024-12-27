#!/bin/bash -ex

cd grammars
cp ./codegen/http/tree-sitter-http.wasm ../build/tree-sitter-http.wasm
cp ./codegen/json/tree-sitter-json.wasm ../build/tree-sitter-json.wasm