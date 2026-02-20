import { EditorState, ContentBlock } from 'draft-js'

/**
 * Map of Draft.js block types to their markdown prefix generators.
 */
const BLOCK_TYPE_PREFIX: Record<string, (block: ContentBlock) => string> = {
  'header-one': () => '# ',
  'header-two': () => '## ',
  'header-three': () => '### ',
  'header-four': () => '#### ',
  'header-five': () => '##### ',
  'header-six': () => '###### ',
  'unordered-list-item': (block) => {
    const indent = '  '.repeat(block.getDepth())
    return `${indent}- `
  },
  'ordered-list-item': (block) => {
    const indent = '  '.repeat(block.getDepth())
    return `${indent}1. `
  },
  blockquote: () => '> ',
  'code-block': () => '', // handled separately
  unstyled: () => '',
}

/**
 * Represents a style transition point in a block of text.
 */
interface StylePoint {
  offset: number
  /** Styles being opened at this offset */
  open: string[]
  /** Styles being closed at this offset */
  close: string[]
}

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
export function draftStateToMarkdown(editorState: EditorState): string {
  const contentState = editorState.getCurrentContent()
  const blocks = contentState.getBlocksAsArray()

  if (blocks.length === 0) return ''

  const markdownLines: string[] = []
  let inCodeBlock = false

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const blockType = block.getType()
    const text = block.getText()

    // Handle code blocks
    if (blockType === 'code-block') {
      if (!inCodeBlock) {
        markdownLines.push('```')
        inCodeBlock = true
      }
      markdownLines.push(text)
      // Check if next block is also a code block
      const nextBlock = i + 1 < blocks.length ? blocks[i + 1] : null
      if (!nextBlock || nextBlock.getType() !== 'code-block') {
        markdownLines.push('```')
        inCodeBlock = false
      }
      continue
    }

    // Close any open code block if we're leaving code-block type
    if (inCodeBlock) {
      markdownLines.push('```')
      inCodeBlock = false
    }

    // Check if the line looks like a table (contains pipes)
    if (text.includes('|') && blockType === 'unstyled') {
      markdownLines.push(text)
      continue
    }

    // Apply inline styles
    const styledText = applyInlineStyles(block)

    // Get the block prefix
    const prefixFn = BLOCK_TYPE_PREFIX[blockType] || (() => '')
    const prefix = prefixFn(block)

    markdownLines.push(`${prefix}${styledText}`)
  }

  // Close any trailing code block
  if (inCodeBlock) {
    markdownLines.push('```')
  }

  return markdownLines.join('\n')
}

/**
 * Apply inline style markers to a block's text based on its character metadata.
 *
 * Handles overlapping and nested styles correctly by:
 * 1. Collecting style ranges from character metadata
 * 2. Computing open/close transition points
 * 3. Inserting markers in correct order (close inner before close outer,
 *    open outer before open inner — "LIFO" nesting for valid markdown)
 */
function applyInlineStyles(block: ContentBlock): string {
  const text = block.getText()
  if (text.length === 0) return ''

  // Collect contiguous style ranges
  const styleRanges = collectStyleRanges(block)

  if (styleRanges.length === 0) return text

  // Build transition points
  const points = buildTransitionPoints(styleRanges)

  // Insert markers into text
  return insertMarkers(text, points)
}

interface StyleRangeInfo {
  style: string
  offset: number
  length: number
}

/**
 * Collect contiguous ranges of each inline style from the block's character list.
 */
function collectStyleRanges(block: ContentBlock): StyleRangeInfo[] {
  const text = block.getText()
  const ranges: StyleRangeInfo[] = []

  // Track active styles and their start positions
  const activeStyles = new Map<string, number>()

  for (let i = 0; i <= text.length; i++) {
    const currentStyles = i < text.length ? block.getInlineStyleAt(i).toArray() : []

    // Check for styles that ended
    for (const [style, startOffset] of activeStyles) {
      if (!currentStyles.includes(style)) {
        ranges.push({ style, offset: startOffset, length: i - startOffset })
        activeStyles.delete(style)
      }
    }

    // Check for styles that started
    for (const style of currentStyles) {
      if (!activeStyles.has(style)) {
        activeStyles.set(style, i)
      }
    }
  }

  return ranges
}

/**
 * Convert style ranges into a set of ordered transition points
 * that specify which markers to insert at each text offset.
 */
function buildTransitionPoints(ranges: StyleRangeInfo[]): StylePoint[] {
  const pointMap = new Map<number, StylePoint>()

  function getPoint(offset: number): StylePoint {
    if (!pointMap.has(offset)) {
      pointMap.set(offset, { offset, open: [], close: [] })
    }
    return pointMap.get(offset)!
  }

  // Sort ranges by offset, then by length descending (wider styles first)
  const sorted = [...ranges].sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset
    return b.length - a.length // wider ranges first → outer styles open first
  })

  for (const range of sorted) {
    getPoint(range.offset).open.push(range.style)
    getPoint(range.offset + range.length).close.push(range.style)
  }

  // At each point, close markers should be in reverse order of opening
  // (LIFO) for valid nesting. We'll handle this in insertMarkers.

  const points = [...pointMap.values()].sort((a, b) => a.offset - b.offset)
  return points
}

/**
 * Style-to-markdown-marker mapping.
 */
function getMarker(style: string): { open: string; close: string } {
  switch (style) {
    case 'BOLD':
      return { open: '**', close: '**' }
    case 'ITALIC':
      return { open: '*', close: '*' }
    case 'UNDERLINE':
      return { open: '<u>', close: '</u>' }
    case 'STRIKETHROUGH':
      return { open: '~~', close: '~~' }
    case 'CODE':
      return { open: '`', close: '`' }
    default:
      return { open: '', close: '' }
  }
}

/**
 * Insert style markers into the text at the computed transition points.
 */
function insertMarkers(text: string, points: StylePoint[]): string {
  // We need to track which styles are currently open (stack-like) so we can
  // close them in the correct order for valid markdown nesting.
  const openStack: string[] = []

  let result = ''
  let lastOffset = 0

  for (const point of points) {
    // Add text between last point and this one
    result += text.slice(lastOffset, point.offset)
    lastOffset = point.offset

    // Process closes first — in reverse order of how they were opened (LIFO)
    // to produce valid nested markdown
    if (point.close.length > 0) {
      // Close in reverse stack order
      const closingOrder = [...point.close].sort((a, b) => {
        const idxA = openStack.lastIndexOf(a)
        const idxB = openStack.lastIndexOf(b)
        // Close the most recently opened first
        return idxB - idxA
      })

      for (const style of closingOrder) {
        result += getMarker(style).close
        const idx = openStack.lastIndexOf(style)
        if (idx !== -1) openStack.splice(idx, 1)
      }
    }

    // Process opens — wider/outer styles first (already sorted that way)
    for (const style of point.open) {
      result += getMarker(style).open
      openStack.push(style)
    }
  }

  // Append remaining text
  result += text.slice(lastOffset)

  // Close any still-open styles (shouldn't happen with well-formed input)
  while (openStack.length > 0) {
    const style = openStack.pop()!
    result += getMarker(style).close
  }

  return result
}
