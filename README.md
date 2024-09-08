# OpenAPI specification aware REST/HTTP language support

This repo is a monorepo for various npm packages to enable language support for REST/HTTP APIs in various online editors, provided OpenAPI spec.

## Justfile

This repo uses `justfile` [(manual)](https://just.systems/man/en/) for developer commands

If you don't want to install `just` command refer to this document's "Avoid justfile" section.

Easiest ways to install justfiles seem to be using `cargo` or `brew` since there aren't many repositories that have it yet.

When cloning this repo, feel free to replace the Justfile by your preferred way of running scripts.

## Dev setup

```
git clone ... <dir>
cd <dir>
just install
just link
just build
just test
```

## Avoid justfile

Justfile is similar to GNU Makefile, but more suitable as general purpose command runner
instead of C/C++ a build system.

Basically you create `justfile` in your directory, don't have to set it execute permissions,
dump all your scripts into it seperated by the command name, and just run `just <COMMAND_NAME>`

Commands look like this:

```
command:
    script line 1
    script line 2
    script line 3
```

The indentation of the script lines is mandatory (i think)

You can almost run each script line manually.

Beware:
If the command/recipe does not have a shebang (`#!/bin/bash`),
it will run each line in it's own shell. Keep that in mind when running the scripts manually

For example:
`GITDIR/justfile`
```
recipe:
    cd foo && pwd
    cd bar && pwd
```
will produce
```
$> just recipe
GITDIR/foo
GITDIR/bar
```
but
`GITDIR/justfile`
```
recipe:
    #!/bin/bash
    cd foo && pwd
    cd bar && pwd
```
will produce
```
$> just recipe
GITDIR/foo
GITDIR/foo/bar
```