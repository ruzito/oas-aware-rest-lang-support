default-choose:
    -@just --choose

build-asm:
    cd backend_asm_script && npm run build

build-vanilla:
    cd backend_asm_script && npm run build
    cd backend_vanilla && npm run build

build: build-asm build-vanilla

unit-asm:
    cd backend_asm_script && npm run test

unit-vanilla:
    cd backend_vanilla && npm run test

unit: unit-asm unit-vanilla

test-integration:
    cd integration_tests && npm run test

test: unit test-integration

link:
    # uplink vanilla
    cd backend_vanilla && npm link

    # uplink asm_script
    cd backend_asm_script && npm link

    # downlink tests
    cd integration_tests && npm link @ruzito/oas-ls-backend-vanilla
    cd integration_tests && npm link @ruzito/oas-ls-backend-asm-script

    # downlink benchmarks
    cd benchmarks && npm link @ruzito/oas-ls-backend-vanilla
    cd benchmarks && npm link @ruzito/oas-ls-backend-asm-script

unlink:
    # unlink tests
    cd integration_tests && npm unlink --no-save @ruzito/oas-ls-backend-vanilla
    cd integration_tests && npm unlink --no-save @ruzito/oas-ls-backend-asm-script

    # unlink benchmarks
    cd benchmarks && npm unlink @ruzito/oas-ls-backend-vanilla
    cd benchmarks && npm unlink @ruzito/oas-ls-backend-asm-script

    # unlink vanilla
    cd backend_vanilla && npm unlink -g

    # unlink asm_script
    cd backend_asm_script && npm unlink -g

install-freeze:
    cd backend_asm_script && npm install
    cd backend_vanilla && npm install
    cd benchmarks && npm install
    cd integration_tests && npm install

install:
    cd backend_asm_script && npm ci
    cd backend_vanilla && npm ci
    cd benchmarks && npm ci
    cd integration_tests && npm ci

_bash_multiline_snippet:
    #!/bin/bash
    set -euxo pipefail
