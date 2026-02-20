import { EditorState } from 'draft-js';

/**
 * Convert an `EditorState` to a markdown string.
 *
 * Handles:
 * - All block types (headers, lists, blockquotes, code blocks)
 * - Inline styles (BOLD, ITALIC, UNDERLINE, STRIKETHROUGH, CODE)
 * - Overlapping/nested styles with correct marker interleaving
 * - Table lines (pipes) preserved verbatim
 * - LaTeX delimiters preserved as-is
 */
export declare function draftStateToMarkdown(editorState: EditorState): string;
