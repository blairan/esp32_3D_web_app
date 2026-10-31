import {HighlightStyle,syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
// Stable semantic classes keep both languages readable on user-selected panels.
export const learningSyntax=syntaxHighlighting(HighlightStyle.define([
  {tag:[tags.keyword,tags.modifier,tags.typeName],color:'var(--code-keyword)'},
  {tag:[tags.string,tags.character],color:'var(--code-string)'},
  {tag:[tags.number,tags.bool,tags.null],color:'var(--code-number)'},
  {tag:tags.comment,color:'var(--code-comment)'},
]));
