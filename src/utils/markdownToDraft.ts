import { ContentBlock, ContentState, EditorState, genKey, CharacterMetadata } from 'draft-js'
import { List, Repeat } from 'immutable'

/**
 * Supported inline style markers mapped to their Draft.js style names.
 */
interface InlineStyleMarker {
  /** The markdown syntax opening/closing marker */
  pattern: RegExp
  /** The Draft.js inline style name */
  style: string
  /** Length of the opening marker characters */
  markerLength: number
}

/**
 * All recognized inline style patterns, ordered from longest marker to shortest
 * so that `***` (BOLD+ITALIC) is matched before `**` (BOLD) or `*` (ITALIC).
 */
const INLINE_STYLE_MARKERS: InlineStyleMarker[] = [
  { pattern: /\*\*\*(.*?)\*\*\*/g, style: 'BOLD_ITALIC', markerLength: 3 },
  { pattern: /\*\*(.*?)\*\*/g, style: 'BOLD', markerLength: 2 },
  { pattern: /\*(.*?)\*/g, style: 'ITALIC', markerLength: 1 },
  { pattern: /~~(.*?)~~/g, style: 'STRIKETHROUGH', markerLength: 2 },
  { pattern: /<u>(.*?)<\/u>/g, style: 'UNDERLINE', markerLength: 3 },
  { pattern: /`(.*?)`/g, style: 'CODE', markerLength: 1 },
]

/**
 * Represents a range of inline styling found in a line of markdown.
 */
interface StyleRange {
  /** Offset in the *plain text* (after markers are stripped) */
  offset: number
  /** Length of the styled text in plain text */
  length: number
  /** Draft.js style name(s) */
  styles: string[]
}

/**
 * Determine block type from a markdown line.
 * Returns the block type and the line content with the block-level marker stripped.
 */
function parseBlockType(line: string): { type: string; text: string; depth: number } {
  // Headers
  const headerMatch = line.match(/^(#{1,6})\s+(.*)$/)
  if (headerMatch) {
    const level = headerMatch[1].length
    const typeMap: Record<number, string> = {
      1: 'header-one',
      2: 'header-two',
      3: 'header-three',
      4: 'header-four',
      5: 'header-five',
      6: 'header-six',
    }
    return { type: typeMap[level] || 'unstyled', text: headerMatch[2], depth: 0 }
  }

  // Unordered list items (-, *, +)
  const ulMatch = line.match(/^(\s*)[*\-+]\s+(.*)$/)
  if (ulMatch) {
    const indent = ulMatch[1].length
    const depth = Math.floor(indent / 2)
    return { type: 'unordered-list-item', text: ulMatch[2], depth }
  }

  // Ordered list items
  const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/)
  if (olMatch) {
    const indent = olMatch[1].length
    const depth = Math.floor(indent / 2)
    return { type: 'ordered-list-item', text: olMatch[2], depth }
  }

  // Blockquote
  const bqMatch = line.match(/^>\s?(.*)$/)
  if (bqMatch) {
    return { type: 'blockquote', text: bqMatch[1], depth: 0 }
  }

  return { type: 'unstyled', text: line, depth: 0 }
}

/**
 * Parse inline styles from a markdown text string.
 * Returns the plain text (markers stripped) and an array of style ranges
 * with correct offsets accounting for cumulative marker removal.
 */
function parseInlineStyles(text: string): { plainText: string; styleRanges: StyleRange[] } {
  // We'll do multiple passes. Each pass finds markers, records the styled ranges
  // (with their positions in the *current* text state), then strips them.
  // We track cumulative offset shifts so ranges map to the final plain text.

  interface RawRange {
    startInOriginal: number
    endInOriginal: number
    styles: string[]
  }

  // First, find all style ranges in the original text.
  // We process in priority order (longest markers first).
  const rawRanges: RawRange[] = []
  let workingText = text

  // We need to find nested / overlapping styles correctly.
  // Strategy: process each style pattern, tracking which character positions
  // are "consumed" by markers.

  interface MarkerPosition {
    /** Start index of the opening marker in original text */
    openStart: number
    /** End index of the opening marker (exclusive) in original text */
    openEnd: number
    /** Start index of the closing marker in original text */
    closeStart: number
    /** End index of the closing marker (exclusive) in original text */
    closeEnd: number
    /** The inner content start in original text */
    contentStart: number
    /** The inner content end (exclusive) in original text */
    contentEnd: number
    /** Style(s) to apply */
    styles: string[]
  }

  const allMarkers: MarkerPosition[] = []

  for (const marker of INLINE_STYLE_MARKERS) {
    const regex = new RegExp(marker.pattern.source, 'g')
    let match: RegExpExecArray | null
    while ((match = regex.exec(workingText)) !== null) {
      const fullMatchStart = match.index
      const fullMatchEnd = fullMatchStart + match[0].length

      let openLen: number
      let closeLen: number

      if (marker.style === 'UNDERLINE') {
        // <u> ... </u>
        openLen = 3 // <u>
        closeLen = 4 // </u>
      } else {
        openLen = marker.markerLength
        closeLen = marker.markerLength
      }

      const contentStart = fullMatchStart + openLen
      const contentEnd = fullMatchEnd - closeLen

      const styles = marker.style === 'BOLD_ITALIC' ? ['BOLD', 'ITALIC'] : [marker.style]

      allMarkers.push({
        openStart: fullMatchStart,
        openEnd: contentStart,
        closeStart: contentEnd,
        closeEnd: fullMatchEnd,
        contentStart,
        contentEnd,
        styles,
      })
    }
  }

  // Sort markers by their position in the original text
  allMarkers.sort((a, b) => a.openStart - b.openStart || a.openEnd - b.openEnd)

  // Now build the plain text by removing all marker characters,
  // and compute the style ranges in plain-text coordinates.

  // Collect all "remove" ranges (the markers themselves)
  interface RemoveRange {
    start: number
    end: number
  }
  const removeRanges: RemoveRange[] = []
  for (const m of allMarkers) {
    removeRanges.push({ start: m.openStart, end: m.openEnd })
    removeRanges.push({ start: m.closeStart, end: m.closeEnd })
  }

  // Sort and merge overlapping remove ranges
  removeRanges.sort((a, b) => a.start - b.start)
  const mergedRemoves: RemoveRange[] = []
  for (const r of removeRanges) {
    if (mergedRemoves.length > 0 && r.start <= mergedRemoves[mergedRemoves.length - 1].end) {
      mergedRemoves[mergedRemoves.length - 1].end = Math.max(
        mergedRemoves[mergedRemoves.length - 1].end,
        r.end,
      )
    } else {
      mergedRemoves.push({ ...r })
    }
  }

  // Build a mapping from original index → plain text index
  // by computing cumulative removed characters up to each position
  function originalToPlain(origIdx: number): number {
    let removed = 0
    for (const r of mergedRemoves) {
      if (r.end <= origIdx) {
        removed += r.end - r.start
      } else if (r.start < origIdx) {
        removed += origIdx - r.start
      } else {
        break
      }
    }
    return origIdx - removed
  }

  // Build plain text
  let plainText = ''
  let lastEnd = 0
  for (const r of mergedRemoves) {
    plainText += workingText.slice(lastEnd, r.start)
    lastEnd = r.end
  }
  plainText += workingText.slice(lastEnd)

  // Build style ranges in plain text coordinates
  const styleRanges: StyleRange[] = []
  for (const m of allMarkers) {
    const offset = originalToPlain(m.contentStart)
    const endOffset = originalToPlain(m.contentEnd)
    const length = endOffset - offset
    if (length > 0) {
      styleRanges.push({ offset, length, styles: m.styles })
    }
  }

  return { plainText, styleRanges }
}

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
export function markdownToDraftState(markdown: string): EditorState {
  if (!markdown || markdown.trim() === '') {
    return EditorState.createEmpty()
  }

  // Check if the input is already serialized Draft.js JSON
  try {
    const parsed = JSON.parse(markdown)
    if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
      const contentState = ContentState.createFromBlockArray(
        parsed.blocks.map(
          (block: {
            key?: string
            type?: string
            text?: string
            depth?: number
            inlineStyleRanges?: Array<{ offset: number; length: number; style: string }>
            entityRanges?: Array<{ offset: number; length: number; key: number }>
            data?: Record<string, unknown>
          }) =>
            new ContentBlock({
              key: block.key || genKey(),
              type: block.type || 'unstyled',
              text: block.text || '',
              depth: block.depth || 0,
              inlineStyleRanges: block.inlineStyleRanges || [],
              entityRanges: block.entityRanges || [],
              data: block.data || {},
            }),
        ),
      )
      return EditorState.createWithContent(contentState)
    }
  } catch {
    // Not JSON — proceed with markdown parsing
  }

  const lines = markdown.split('\n')
  const blockArray: ContentBlock[] = []
  let inCodeBlock = false
  let codeBlockLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Handle code fences
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const codeText = codeBlockLines.join('\n')
        blockArray.push(
          new ContentBlock({
            key: genKey(),
            type: 'code-block',
            text: codeText,
            characterList: List(Repeat(CharacterMetadata.create(), codeText.length)),
            depth: 0,
          }),
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    // Parse block type
    const { type, text: blockText, depth } = parseBlockType(line)

    // Parse inline styles from the block text
    const { plainText, styleRanges } = parseInlineStyles(blockText)

    // Build character metadata list with inline styles
    const charMetadata: CharacterMetadata[] = []
    for (let charIdx = 0; charIdx < plainText.length; charIdx++) {
      // Collect all styles that apply at this character position
      let charStyles: string[] = []
      for (const range of styleRanges) {
        if (charIdx >= range.offset && charIdx < range.offset + range.length) {
          charStyles = charStyles.concat(range.styles)
        }
      }

      // Deduplicate styles
      const uniqueStyles = [...new Set(charStyles)]

      let metadata = CharacterMetadata.create()
      for (const style of uniqueStyles) {
        metadata = CharacterMetadata.applyStyle(metadata, style)
      }
      charMetadata.push(metadata)
    }

    blockArray.push(
      new ContentBlock({
        key: genKey(),
        type,
        text: plainText,
        characterList: List(charMetadata),
        depth,
      }),
    )
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    const codeText = codeBlockLines.join('\n')
    blockArray.push(
      new ContentBlock({
        key: genKey(),
        type: 'code-block',
        text: codeText,
        characterList: List(Repeat(CharacterMetadata.create(), codeText.length)),
        depth: 0,
      }),
    )
  }

  if (blockArray.length === 0) {
    return EditorState.createEmpty()
  }

  const contentState = ContentState.createFromBlockArray(blockArray)

  return EditorState.createWithContent(contentState)
}
