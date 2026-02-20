import type { Components } from 'react-markdown'

/**
 * Props for the `<MathMarkdown>` component.
 */
export interface MathMarkdownProps {
  /** Markdown + LaTeX content string to render. */
  content: string
  /** Optional CSS class name applied to the wrapper element. */
  className?: string
  /**
   * Override react-markdown component renderers (table, code, etc.).
   * Merged with built-in defaults — your overrides take precedence.
   */
  components?: Components
}
