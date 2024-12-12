export const HTTP_SEPARATOR: string = "-"
export const SEPARATOR_EXPLANATION: string = `
### Mandatory HTTP separator

Please write at least three '${HTTP_SEPARATOR}' characters
on a separate line between HTTP Headers and JSON body.

Even tho HTTP does not require nor support this separator,
for the purposes of this language server you need to add
at least 3 '${HTTP_SEPARATOR}' characters on a standalone line
to denote where HTTP headers end and JSON body begin.

This is due to HTTP using an empty line as a separator
which causes issues while parsing a partially complete
request being written by human hand.

I have decided that it would be better to force you to write
a separator than to produce nonsensical results.
`