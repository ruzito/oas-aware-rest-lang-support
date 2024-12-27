#!/bin/bash -ex

function build_git() {
    docker buildx build --build-arg TREE_SITTER_NAME="$1" --build-arg TREE_SITTER_GRAMMAR_LOCATION="$2" -t tree_sitter_"$1" -f git-grammar.dockerfile --output . .
}
function build_dir() {
    docker buildx build --build-arg TREE_SITTER_NAME="$1" --build-arg TREE_SITTER_GRAMMAR_LOCATION="$2" -t tree_sitter_"$1" -f dir-grammar.dockerfile --output . .
}

cd grammars
rm -rf ./codegen/
# build_dir http_n_json src
# build_git http https://github.com/rest-nvim/tree-sitter-http
build_dir http src
build_git json https://github.com/tree-sitter/tree-sitter-json.git