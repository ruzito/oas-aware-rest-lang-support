# OpenAPI specification aware REST/HTTP language support

This repo is a monorepo for various npm packages to enable language support for REST/HTTP APIs in various online editors, provided OpenAPI spec.

## User Manual

### First full build

If you just want to download the repo and just want to build it,
just run the following:

```
git clone <git-url> <dir>
cd <dir>
run/fresh # dependency install (no-globals), full build
```

### Tests

After first build you can:

```
run/test # automated tests
run/web # start web server GUIs
```

## Dev manual

If you want to change code as well, the following might come in handy

### Change internal dependencies

```
run/unlink
# here modify run/link, run/unlink scripts
run/link
```

### Change external dependencies / update versions

```
run/install-freeze
```

### Download dependencies

```
run/install
```

### Rebuild

```
run/build
```

## Architecture

```mermaid
flowchart BT;
    subgraph backend[One of the backends]
        backend_vanilla;
        backend_asm_script;
    end
    frontend_codemirror-->backend;
    frontend_monaco-->backend;
    frontend_lsp-->backend;
    subgraph project[This project]
        backend;
        frontend_lsp;
        frontend_monaco;
        frontend_codemirror;
    end
    subgraph Usage
        LSP;
        Monaco;
        Codemirror;
    end
    LSP[LSP server]-->frontend_lsp;
    Monaco[Monaco web app]-->frontend_monaco;
    Codemirror[Codemirror web app]-->frontend_codemirror;
    style project fill:#00ff000a
    style backend fill:#00000000
    style Usage fill:#0000000a
```

## Links

[Codemirror Language Support](https://codemirror.net/docs/ref/#language.LanguageSupport)