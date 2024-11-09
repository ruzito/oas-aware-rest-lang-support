#!/bin/bash

cd grammar
docker buildx build -t tree_sitter_http_wasm  --output . .
mv tree-sitter-http.wasm ../build/tree-sitter-http.wasm