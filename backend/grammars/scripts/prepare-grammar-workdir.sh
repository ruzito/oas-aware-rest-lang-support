#!/bin/bash -ex

if [[ ! -f 'tree-sitter.json' ]]
then
    echo '{ "grammars": [ { "name": "'"$1"'", "scope": "source.'"$1"'" } ], "metadata": { "version": "0.1.0" } }' > tree-sitter.json
fi