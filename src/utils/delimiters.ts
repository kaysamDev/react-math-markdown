/**
 * Regex to detect fenced code blocks (``` ... ```) so we can skip
 * delimiter transformation inside them.
 */
const CODE_FENCE_RE = /^(`{3,})[^`]*$[\s\S]*?^\1\s*$/gm

/**
 * Preprocess LaTeX delimiters in a markdown string for KaTeX rendering.
 *
 * Converts `\(...\)` → `$...$` and `\[...\]` → `$$...$$` so that
 * remark-math + rehype-katex can process them.
 *
 * Content inside fenced code blocks is never transformed.
 */
export function preprocessDelimiters(content: string): string {
  if (!content) return content

  // Split content into code-fence regions and non-code regions.
  // We only transform non-code regions.
  const parts = splitByCodeFences(content)

  const transformed = parts
    .map((part) => {
      if (part.isCode) return part.text
      return convertForKaTeX(part.text)
    })
    .join('')

  return transformed
}

interface TextPart {
  text: string
  isCode: boolean
}

/**
 * Split markdown content into alternating non-code / code-fence segments.
 */
function splitByCodeFences(content: string): TextPart[] {
  const parts: TextPart[] = []
  let lastIndex = 0

  // Reset regex state
  CODE_FENCE_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = CODE_FENCE_RE.exec(content)) !== null) {
    // Text before this code fence
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index), isCode: false })
    }
    // The code fence itself
    parts.push({ text: match[0], isCode: true })
    lastIndex = match.index + match[0].length
  }

  // Remaining text after last code fence
  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), isCode: false })
  }

  if (parts.length === 0) {
    parts.push({ text: content, isCode: false })
  }

  return parts
}

/**
 * For KaTeX: convert `\(...\)` → `$...$` and `\[...\]` → `$$...$$`.
 *
 * Uses non-greedy matching to handle multiple math expressions on one line.
 */
function convertForKaTeX(text: string): string {
  let result = text

  // Convert display math first: \[...\] → $$...$$
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')

  // Convert inline math: \(...\) → $...$
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')

  return result
}
