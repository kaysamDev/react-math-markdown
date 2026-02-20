# react-math-markdown

A unified React component for rendering **Markdown + LaTeX math** with KaTeX, plus robust **Markdown ↔ Draft.js** conversion utilities.

## Features

- 🧮 **Unified `<MathMarkdown>` component** — renders Markdown with embedded LaTeX math in a single component
- ⚡ **KaTeX-powered** — fast, synchronous math rendering with no page reflow
- 📝 **Draft.js conversion** — bidirectional Markdown ↔ Draft.js state conversion with correct inline style offset handling
- 🎨 **Customizable** — override any rendered element via the `components` prop
- 📦 **Tree-shakeable** — ESM + CJS dual output, only import what you need
- 🔤 **Delimiter normalization** — automatically converts `\(...\)` / `\[...\]` to KaTeX-compatible `$...$` / `$$...$$`

## Installation

```bash
npm install react-math-markdown
```

### Peer Dependencies

```bash
# Required
npm install react react-dom

# Optional — only if using <MathMarkdown> with math rendering
npm install katex

# Optional — only if using Draft.js conversion utilities
npm install draft-js
```

### KaTeX CSS

You must include the KaTeX stylesheet in your app. Choose one method:

**Option A — HTML link (recommended)**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
```

**Option B — CSS import**

```css
@import 'katex/dist/katex.min.css';
```

## Quick Start

### Rendering Markdown + Math

```tsx
import { MathMarkdown } from 'react-math-markdown'

function MyComponent() {
  const content = `
# Quadratic Formula

The solutions to \\(ax^2 + bx + c = 0\\) are:

\\[
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\]

| Variable | Meaning        |
|----------|----------------|
| \\(a\\)  | coefficient     |
| \\(b\\)  | coefficient     |
| \\(c\\)  | constant term   |
  `

  return <MathMarkdown content={content} />
}
```

### With Custom Styling

```tsx
import { MathMarkdown } from 'react-math-markdown'

function StyledMath() {
  return (
    <MathMarkdown
      content="The integral \\(\\int_0^1 x^2 dx = \\frac{1}{3}\\)"
      className="my-math-container"
      components={{
        table: ({ children }) => <table className="my-custom-table">{children}</table>,
        blockquote: ({ children }) => <blockquote className="my-quote">{children}</blockquote>,
      }}
    />
  )
}
```

### Draft.js Conversion

```tsx
import { useState } from 'react'
import { Editor, EditorState } from 'draft-js'
import { markdownToDraftState, draftStateToMarkdown, MathMarkdown } from 'react-math-markdown'

function MarkdownEditor() {
  const markdown = '**Hello** world with \\(x^2\\)'
  const [editorState, setEditorState] = useState(() => markdownToDraftState(markdown))

  const handleExport = () => {
    const md = draftStateToMarkdown(editorState)
    console.log(md) // "**Hello** world with \(x^2\) "
  }

  return (
    <div>
      {/* Rich text editor */}
      <Editor editorState={editorState} onChange={setEditorState} />

      {/* Preview */}
      <MathMarkdown content={draftStateToMarkdown(editorState)} />

      <button onClick={handleExport}>Export Markdown</button>
    </div>
  )
}
```

### Delimiter Preprocessing (Advanced)

```tsx
import { preprocessDelimiters } from 'react-math-markdown'

// Converts \(...\) to $...$ and \[...\] to $$...$$
const normalized = preprocessDelimiters('Solve \\(x^2 + 1 = 0\\) and display:\\[x = \\pm i\\]')
// Result: "Solve $x^2 + 1 = 0$ and display:$$x = \\pm i$$"
```

## API Reference

### `<MathMarkdown>`

The main rendering component.

| Prop         | Type                      | Default                    | Description                                     |
| ------------ | ------------------------- | -------------------------- | ----------------------------------------------- |
| `content`    | `string`                  | _required_                 | Markdown string with optional LaTeX math        |
| `className`  | `string`                  | `undefined`                | CSS class for the wrapper `<div>`               |
| `components` | `ReactMarkdownComponents` | Built-in styled components | Override rendered elements (tables, code, etc.) |

**Supported math delimiters:**

- Inline: `\(...\)` or `$...$`
- Display: `\[...\]` or `$$...$$`

**Built-in styled components** for: `table`, `thead`, `th`, `td`, `code`, `pre`, `blockquote`, `ul`, `ol`, `a`

---

### `markdownToDraftState(markdown: string): EditorState`

Converts a Markdown string to a Draft.js `EditorState`.

**Supported block types:**

- Headings (`# ` through `###### `)
- Unordered lists (`- `, `* `, `+ `)
- Ordered lists (`1. `, `2. `)
- Blockquotes (`> `)
- Code blocks (` ``` `)
- Paragraphs

**Supported inline styles:**

- Bold (`**text**`)
- Italic (`*text*`)
- Underline (`<u>text</u>`)
- Strikethrough (`~~text~~`)
- Inline code (`` `text` ``)

**Special handling:**

- LaTeX delimiters `\(...\)` are preserved as literal text
- Table pipe syntax preserved as unstyled blocks
- Accepts pre-serialized Draft.js JSON (auto-detected via `JSON.parse`)

---

### `draftStateToMarkdown(editorState: EditorState): string`

Converts a Draft.js `EditorState` back to a Markdown string.

**Handles:**

- All block types → appropriate Markdown syntax
- Overlapping/nested inline styles with correct marker interleaving
- Table lines preserved verbatim

---

### `preprocessDelimiters(content: string): string`

Normalizes LaTeX delimiters for KaTeX compatibility.

| Input                      | Output              |
| -------------------------- | ------------------- |
| `\(x^2\)`                  | `$x^2$`             |
| `\[x^2\]`                  | `$$x^2$$`           |
| `$x^2$`                    | `$x^2$` (unchanged) |
| Content inside code fences | Unchanged           |

## Math Delimiter Guide

| Style   | Input          | Renders as             |
| ------- | -------------- | ---------------------- |
| Inline  | `\(E = mc^2\)` | Inline math: _E = mc²_ |
| Inline  | `$E = mc^2$`   | Inline math: _E = mc²_ |
| Display | `\[E = mc^2\]` | Centered display math  |
| Display | `$$E = mc^2$$` | Centered display math  |

## Supported LaTeX

All standard KaTeX functions are supported. See the [KaTeX function support table](https://katex.org/docs/support_table.html).

Common examples:

```
\frac{a}{b}          → fractions
\sqrt{x}             → square root
\int_a^b f(x)dx      → integrals
\sum_{i=1}^n         → summation
\begin{pmatrix}      → matrices
\alpha, \beta, \pi   → Greek letters
\leq, \geq, \neq     → comparison operators
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type { MathMarkdownProps } from 'react-math-markdown'
```

## License

MIT
