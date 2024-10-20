import {styleTags, tags} from "@lezer/highlight"

export const jsonHighlighting = styleTags({
    "Method": tags.keyword,
    "Path": tags.url,
    "Version": tags.variableName,
    "HeaderKey": tags.propertyName,
    "HeaderValue": tags.string
})