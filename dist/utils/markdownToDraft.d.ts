import { EditorState } from 'draft-js';

/**
 * Convert a markdown string to a Draft.js `EditorState`.
 *
 * Handles:
 * - Block types: headers (h1–h6), unordered/ordered lists, blockquotes, code blocks, unstyled
 * - Inline styles: BOLD, ITALIC, UNDERLINE, STRIKETHROUGH, CODE
 * - LaTeX delimiters preserved as literal text
 * - Tables preserved as unstyled blocks
 * - Already-serialized Draft.js JSON (detected via `JSON.parse`)
 *
 * The offset tracking correctly handles cumulative shifts from stripping
 * markdown syntax markers, fixing the broken inline style offset bugs.
 */
export declare function markdownToDraftState(markdown: string): EditorState;
