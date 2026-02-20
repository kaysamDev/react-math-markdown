import React, { useState, useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { MathMarkdown, preprocessDelimiters } from '../src/index'

const SAMPLE_CONTENT = `# Math + Markdown Demo

## Inline Math

The quadratic formula is \\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\).

Einstein's famous equation: \\(E = mc^2\\)

Greek letters: \\(\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\theta, \\lambda, \\pi, \\sigma, \\omega\\)

## Display Math

\\[
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
\\]

\\[
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
\\]

## Text Formatting

This is **bold**, this is *italic*, this is ***bold and italic***, and this is ~~strikethrough~~.

## Lists

- First item
- Second item
  - Nested item A
  - Nested item B
- Third item

1. Ordered one
2. Ordered two
3. Ordered three

## Blockquote

> Mathematics is the queen of the sciences.
> — Carl Friedrich Gauss

## Code

Inline code: \`const x = 42;\`

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`

## Table

| Function | Derivative | Integral |
|----------|-----------|----------|
| \\(x^n\\) | \\(nx^{n-1}\\) | \\(\\frac{x^{n+1}}{n+1}\\) |
| \\(e^x\\) | \\(e^x\\) | \\(e^x\\) |
| \\(\\sin x\\) | \\(\\cos x\\) | \\(-\\cos x\\) |

## Matrix

\\[
A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}, \\quad \\det(A) = -2
\\]
`

// ─── Math Calculator ────────────────────────────────────────────────────────

interface MathSymbol {
  label: string
  latex: string
  /** Tooltip description */
  desc?: string
}

interface MathCategory {
  name: string
  icon: string
  symbols: MathSymbol[]
}

/* eslint-disable no-useless-escape */
const MATH_CATEGORIES: MathCategory[] = [
  {
    name: 'Common',
    icon: '±',
    symbols: [
      { label: '+', latex: '+', desc: 'Plus' },
      { label: '−', latex: '-', desc: 'Minus' },
      { label: '×', latex: '\\times ', desc: 'Multiply' },
      { label: '÷', latex: '\\div ', desc: 'Divide' },
      { label: '=', latex: '=', desc: 'Equals' },
      { label: '≠', latex: '\\neq ', desc: 'Not equal' },
      { label: '±', latex: '\\pm ', desc: 'Plus-minus' },
      { label: '<', latex: '<', desc: 'Less than' },
      { label: '>', latex: '>', desc: 'Greater than' },
      { label: '≤', latex: '\\leq ', desc: 'Less or equal' },
      { label: '≥', latex: '\\geq ', desc: 'Greater or equal' },
      { label: '≈', latex: '\\approx ', desc: 'Approximately' },
      { label: '∞', latex: '\\infty ', desc: 'Infinity' },
      { label: '…', latex: '\\ldots ', desc: 'Ellipsis' },
      { label: '∴', latex: '\\therefore ', desc: 'Therefore' },
      { label: '∵', latex: '\\because ', desc: 'Because' },
    ],
  },
  {
    name: 'Structures',
    icon: '⁄',
    symbols: [
      { label: 'a/b', latex: '\\frac{a}{b}', desc: 'Fraction' },
      { label: '√', latex: '\\sqrt{x}', desc: 'Square root' },
      { label: '∛', latex: '\\sqrt[3]{x}', desc: 'Cube root' },
      { label: 'xⁿ', latex: 'x^{n}', desc: 'Superscript' },
      { label: 'xₙ', latex: 'x_{n}', desc: 'Subscript' },
      { label: 'xₙᵐ', latex: 'x_{n}^{m}', desc: 'Sub + super' },
      { label: '|x|', latex: '|x|', desc: 'Absolute value' },
      { label: '⌈x⌉', latex: '\\lceil x \\rceil', desc: 'Ceiling' },
      { label: '⌊x⌋', latex: '\\lfloor x \\rfloor', desc: 'Floor' },
      { label: '(n k)', latex: '\\binom{n}{k}', desc: 'Binomial' },
      { label: 'lim', latex: '\\lim_{x \\to a}', desc: 'Limit' },
      { label: 'log', latex: '\\log_{b}(x)', desc: 'Logarithm' },
      { label: 'ln', latex: '\\ln(x)', desc: 'Natural log' },
    ],
  },
  {
    name: 'Greek',
    icon: 'α',
    symbols: [
      { label: 'α', latex: '\\alpha ', desc: 'alpha' },
      { label: 'β', latex: '\\beta ', desc: 'beta' },
      { label: 'γ', latex: '\\gamma ', desc: 'gamma' },
      { label: 'δ', latex: '\\delta ', desc: 'delta' },
      { label: 'ε', latex: '\\epsilon ', desc: 'epsilon' },
      { label: 'ζ', latex: '\\zeta ', desc: 'zeta' },
      { label: 'η', latex: '\\eta ', desc: 'eta' },
      { label: 'θ', latex: '\\theta ', desc: 'theta' },
      { label: 'λ', latex: '\\lambda ', desc: 'lambda' },
      { label: 'μ', latex: '\\mu ', desc: 'mu' },
      { label: 'π', latex: '\\pi ', desc: 'pi' },
      { label: 'ρ', latex: '\\rho ', desc: 'rho' },
      { label: 'σ', latex: '\\sigma ', desc: 'sigma' },
      { label: 'τ', latex: '\\tau ', desc: 'tau' },
      { label: 'φ', latex: '\\phi ', desc: 'phi' },
      { label: 'ψ', latex: '\\psi ', desc: 'psi' },
      { label: 'ω', latex: '\\omega ', desc: 'omega' },
      { label: 'Δ', latex: '\\Delta ', desc: 'Delta' },
      { label: 'Σ', latex: '\\Sigma ', desc: 'Sigma' },
      { label: 'Ω', latex: '\\Omega ', desc: 'Omega' },
    ],
  },
  {
    name: 'Calculus',
    icon: '∫',
    symbols: [
      { label: '∫', latex: '\\int ', desc: 'Integral' },
      { label: '∫ᵃᵇ', latex: '\\int_{a}^{b} ', desc: 'Definite integral' },
      { label: '∬', latex: '\\iint ', desc: 'Double integral' },
      { label: '∮', latex: '\\oint ', desc: 'Contour integral' },
      { label: 'Σ', latex: '\\sum_{i=1}^{n} ', desc: 'Summation' },
      { label: 'Π', latex: '\\prod_{i=1}^{n} ', desc: 'Product' },
      { label: 'd/dx', latex: '\\frac{d}{dx}', desc: 'Derivative' },
      { label: '∂/∂x', latex: '\\frac{\\partial}{\\partial x}', desc: 'Partial derivative' },
      { label: '∇', latex: '\\nabla ', desc: 'Nabla/gradient' },
      { label: "f'", latex: "f'(x)", desc: 'Prime notation' },
    ],
  },
  {
    name: 'Trig',
    icon: 'sin',
    symbols: [
      { label: 'sin', latex: '\\sin ', desc: 'Sine' },
      { label: 'cos', latex: '\\cos ', desc: 'Cosine' },
      { label: 'tan', latex: '\\tan ', desc: 'Tangent' },
      { label: 'csc', latex: '\\csc ', desc: 'Cosecant' },
      { label: 'sec', latex: '\\sec ', desc: 'Secant' },
      { label: 'cot', latex: '\\cot ', desc: 'Cotangent' },
      { label: 'sin⁻¹', latex: '\\arcsin ', desc: 'Arcsine' },
      { label: 'cos⁻¹', latex: '\\arccos ', desc: 'Arccosine' },
      { label: 'tan⁻¹', latex: '\\arctan ', desc: 'Arctangent' },
    ],
  },
  {
    name: 'Sets',
    icon: '∈',
    symbols: [
      { label: '∈', latex: '\\in ', desc: 'Element of' },
      { label: '∉', latex: '\\notin ', desc: 'Not element of' },
      { label: '⊂', latex: '\\subset ', desc: 'Subset' },
      { label: '⊆', latex: '\\subseteq ', desc: 'Subset or equal' },
      { label: '∪', latex: '\\cup ', desc: 'Union' },
      { label: '∩', latex: '\\cap ', desc: 'Intersection' },
      { label: '∅', latex: '\\emptyset ', desc: 'Empty set' },
      { label: 'ℝ', latex: '\\mathbb{R}', desc: 'Real numbers' },
      { label: 'ℤ', latex: '\\mathbb{Z}', desc: 'Integers' },
      { label: 'ℕ', latex: '\\mathbb{N}', desc: 'Natural numbers' },
      { label: '∀', latex: '\\forall ', desc: 'For all' },
      { label: '∃', latex: '\\exists ', desc: 'Exists' },
    ],
  },
  {
    name: 'Matrix',
    icon: '▦',
    symbols: [
      { label: '2×2', latex: '\\begin{pmatrix} a & b \\\\\\\\ c & d \\end{pmatrix}', desc: '2×2 matrix' },
      { label: '3×3', latex: '\\begin{pmatrix} a & b & c \\\\\\\\ d & e & f \\\\\\\\ g & h & i \\end{pmatrix}', desc: '3×3 matrix' },
      { label: '[2×2]', latex: '\\begin{bmatrix} a & b \\\\\\\\ c & d \\end{bmatrix}', desc: '2×2 bracket matrix' },
      { label: 'det', latex: '\\begin{vmatrix} a & b \\\\\\\\ c & d \\end{vmatrix}', desc: 'Determinant' },
      { label: 'vec', latex: '\\vec{v}', desc: 'Vector' },
      { label: 'hat', latex: '\\hat{v}', desc: 'Unit vector' },
      { label: '·', latex: '\\cdot ', desc: 'Dot product' },
      { label: '⊗', latex: '\\otimes ', desc: 'Tensor/cross' },
    ],
  },
  {
    name: 'Arrows',
    icon: '→',
    symbols: [
      { label: '→', latex: '\\rightarrow ', desc: 'Right arrow' },
      { label: '←', latex: '\\leftarrow ', desc: 'Left arrow' },
      { label: '↔', latex: '\\leftrightarrow ', desc: 'Left-right arrow' },
      { label: '⇒', latex: '\\Rightarrow ', desc: 'Implies' },
      { label: '⇐', latex: '\\Leftarrow ', desc: 'Implied by' },
      { label: '⇔', latex: '\\Leftrightarrow ', desc: 'If and only if' },
      { label: '↦', latex: '\\mapsto ', desc: 'Maps to' },
      { label: '→∞', latex: '\\to \\infty ', desc: 'Tends to infinity' },
    ],
  },
]
/* eslint-enable no-useless-escape */

const calcStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    width: '640px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #eee',
    fontWeight: 600,
    fontSize: '1rem',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#888',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
  },
  tabs: {
    display: 'flex',
    gap: '2px',
    padding: '0.5rem 1rem 0',
    borderBottom: '1px solid #eee',
    overflowX: 'auto',
  },
  tab: {
    padding: '0.4rem 0.75rem',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#666',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabActive: {
    color: '#0070f3',
    borderBottomColor: '#0070f3',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
    gap: '6px',
    padding: '1rem 1.25rem',
    overflowY: 'auto',
    maxHeight: '240px',
  },
  symbolBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    background: '#fafafa',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'serif',
    minHeight: '40px',
    transition: 'all 0.1s',
  },
  inputArea: {
    padding: '1rem 1.25rem',
    borderTop: '1px solid #eee',
  },
  latexInput: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    fontSize: '14px',
    fontFamily: 'ui-monospace, monospace',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  previewArea: {
    padding: '0.75rem 1.25rem',
    background: '#f8f9fa',
    borderTop: '1px solid #eee',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderTop: '1px solid #eee',
  },
  footerBtn: {
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
}

interface MathCalculatorProps {
  onInsert: (latex: string, mode: 'inline' | 'display') => void
  onClose: () => void
}

function MathCalculator({ onInsert, onClose }: MathCalculatorProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [latex, setLatex] = useState('')
  const [mode, setMode] = useState<'inline' | 'display'>('inline')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSymbolClick = useCallback((symbol: MathSymbol) => {
    setLatex((prev) => {
      const input = inputRef.current
      if (input) {
        const start = input.selectionStart ?? prev.length
        const end = input.selectionEnd ?? prev.length
        const next = prev.slice(0, start) + symbol.latex + prev.slice(end)
        // Set cursor position after inserted text
        setTimeout(() => {
          input.focus()
          const pos = start + symbol.latex.length
          input.setSelectionRange(pos, pos)
        }, 0)
        return next
      }
      return prev + symbol.latex
    })
  }, [])

  const handleInsert = useCallback(() => {
    if (latex.trim()) {
      onInsert(latex.trim(), mode)
    }
    onClose()
  }, [latex, mode, onInsert, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleInsert()
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [handleInsert, onClose],
  )

  // Build preview content
  const previewContent = latex.trim()
    ? mode === 'inline'
      ? `\\(${latex.trim()}\\)`
      : `\\[${latex.trim()}\\]`
    : ''

  return (
    <div style={calcStyles.overlay} onClick={onClose} onKeyDown={handleKeyDown}>
      <div style={calcStyles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={calcStyles.modalHeader}>
          <span>Math Calculator</span>
          <button style={calcStyles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div style={calcStyles.tabs}>
          {MATH_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              style={{
                ...calcStyles.tab,
                ...(activeTab === i ? calcStyles.tabActive : {}),
              }}
              onClick={() => setActiveTab(i)}
            >
              <span style={{ marginRight: '4px' }}>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Symbol Grid */}
        <div style={calcStyles.grid}>
          {MATH_CATEGORIES[activeTab].symbols.map((sym) => (
            <button
              key={sym.latex}
              style={calcStyles.symbolBtn}
              title={sym.desc ? `${sym.desc}\n${sym.latex}` : sym.latex}
              onMouseEnter={(e) => {
                ;(e.target as HTMLElement).style.background = '#e8f0fe'
                ;(e.target as HTMLElement).style.borderColor = '#0070f3'
              }}
              onMouseLeave={(e) => {
                ;(e.target as HTMLElement).style.background = '#fafafa'
                ;(e.target as HTMLElement).style.borderColor = '#e0e0e0'
              }}
              onClick={() => handleSymbolClick(sym)}
            >
              {sym.label}
            </button>
          ))}
        </div>

        {/* LaTeX Input */}
        <div style={calcStyles.inputArea}>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              alignItems: 'center',
            }}
          >
            <label style={{ fontSize: '0.8rem', color: '#555', fontWeight: 500 }}>LaTeX:</label>
            <div style={{ flex: 1 }} />
            <label style={{ fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>
              <input
                type="radio"
                name="mode"
                checked={mode === 'inline'}
                onChange={() => setMode('inline')}
                style={{ marginRight: '4px' }}
              />
              Inline \( ... \)
            </label>
            <label style={{ fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>
              <input
                type="radio"
                name="mode"
                checked={mode === 'display'}
                onChange={() => setMode('display')}
                style={{ marginRight: '4px' }}
              />
              Display \[ ... \]
            </label>
          </div>
          <input
            ref={inputRef}
            style={calcStyles.latexInput}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type LaTeX or click symbols above..."
            autoFocus
          />
        </div>

        {/* Live Preview */}
        <div style={calcStyles.previewArea}>
          {previewContent ? (
            <MathMarkdown content={previewContent} />
          ) : (
            <span style={{ color: '#bbb', fontSize: '0.9rem' }}>Preview appears here</span>
          )}
        </div>

        {/* Footer */}
        <div style={calcStyles.footer}>
          <button
            style={{
              ...calcStyles.footerBtn,
              border: '1px solid #ccc',
              background: 'white',
              color: '#555',
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              ...calcStyles.footerBtn,
              border: '1px solid #0070f3',
              background: '#0070f3',
              color: 'white',
              opacity: latex.trim() ? 1 : 0.5,
            }}
            disabled={!latex.trim()}
            onClick={handleInsert}
          >
            Insert (Ctrl+Enter)
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#111',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#666',
    marginTop: '0.5rem',
  },
  engineBar: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  btn: {
    padding: '0.5rem 1.25rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    background: 'white',
    transition: 'all 0.15s',
  },
  btnActive: {
    background: '#0070f3',
    color: 'white',
    borderColor: '#0070f3',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    minHeight: '600px',
  },
  card: {
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  cardHeader: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #eee',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: '#555',
    background: '#fafafa',
  },
  textarea: {
    width: '100%',
    flex: 1,
    border: 'none',
    outline: 'none',
    resize: 'none' as const,
    fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    padding: '1rem',
    background: '#fff',
  },
  preview: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto' as const,
    lineHeight: '1.7',
  },
  debugCard: {
    marginTop: '1.5rem',
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  debugPre: {
    padding: '1rem',
    fontSize: '12px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: '250px',
    overflowY: 'auto' as const,
    background: '#1e1e1e',
    color: '#d4d4d4',
    margin: 0,
  },
}

function App() {
  const [content, setContent] = useState(SAMPLE_CONTENT)
  const [showDebug, setShowDebug] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorRef = useRef<number>(0)

  // Track cursor position whenever the textarea selection changes
  const trackCursor = useCallback(() => {
    if (textareaRef.current) {
      cursorRef.current = textareaRef.current.selectionStart ?? 0
    }
  }, [])

  const handleCalcInsert = useCallback(
    (latex: string, mode: 'inline' | 'display') => {
      const wrapped = mode === 'inline' ? `\\(${latex}\\)` : `\n\\[${latex}\\]\n`
      setContent((prev) => {
        const pos = cursorRef.current
        const clamped = Math.min(pos, prev.length)
        return prev.slice(0, clamped) + wrapped + prev.slice(clamped)
      })
      // Restore focus to textarea after insert
      setTimeout(() => textareaRef.current?.focus(), 50)
    },
    [],
  )

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>react-math-markdown</div>
        <div style={styles.subtitle}>
          Unified Markdown + LaTeX rendering — edit on the left, preview on the right
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.engineBar}>
        <span style={{ fontSize: '0.85rem', color: '#555' }}>Engine: KaTeX</span>
        <div style={{ flex: 1 }} />
        <button
          style={{
            ...styles.btn,
            ...(showDebug ? styles.btnActive : {}),
          }}
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? 'Hide' : 'Show'} Debug
        </button>
      </div>

        {/* Editor + Preview */}
        <div style={styles.columns}>
          <div style={styles.card}>
            <div style={{ ...styles.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Markdown + LaTeX Source</span>
              <button
                style={{
                  ...styles.btn,
                  background: '#0070f3',
                  color: 'white',
                  border: '1px solid #0070f3',
                  margin: 0,
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.8rem',
                }}
                onClick={() => setShowCalc(true)}
              >
                Math Calculator
              </button>
            </div>
            <textarea
              ref={textareaRef}
              style={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={trackCursor}
              onClick={trackCursor}
              onKeyUp={trackCursor}
              spellCheck={false}
            />
          </div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              Rendered Preview (KaTeX)
            </div>
            <div style={styles.preview}>
              <MathMarkdown content={content} />
            </div>
          </div>
        </div>

        {/* Math Calculator Modal */}
        {showCalc && (
          <MathCalculator
            onInsert={handleCalcInsert}
            onClose={() => setShowCalc(false)}
          />
        )}

        {/* Debug Panel */}
        {showDebug && (
          <div style={styles.debugCard}>
            <div
              style={{
                ...styles.cardHeader,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Preprocessed Content (after delimiter normalization)</span>
            </div>
            <pre style={styles.debugPre}>
              <code>{preprocessDelimiters(content)}</code>
            </pre>
          </div>
        )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
