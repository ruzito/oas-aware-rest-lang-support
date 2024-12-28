/**
 * @file HTTP request grammar for tree-sitter
 * @author Tomas Ruzicka <tomas.ruzicka.42@seznam.cz>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
    name: 'http',

    rules: {
        document: $ => seq(
            $._http_top,
            repeat(choice($.header, '\n'))
        ),

        header: $ => seq(
            $.header_key, optional(seq(':', repeat(' '), $.header_value)), '\n'
        ),

        header_key: $ => /[^:\n\s]*/,
        header_value: $ => /[^\n]*/,
        method: $ => /[a-zA-Z-]+/,
        version: $ => /[a-zA-Z-\.0-9/]+/,
        path: $ => /[^\s]+/,
        _http_top: $ => seq(
            $.method, repeat1(' '), $.path, repeat1(' '), $.version, '\n'
        ),
    },
});
