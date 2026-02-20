import React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { MathMarkdownProps } from '../types'
import { preprocessDelimiters } from '../utils/delimiters'

/**
 * Default component overrides for react-markdown.
 * Provides styled rendering for tables, code, lists, blockquotes, etc.
 * These use inline styles for portability; consumers can override via the
 * `components` prop or apply their own CSS framework classes.
 */
const defaultComponents: Components = {
  table: ({ children, ...props }) => (
    <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          fontSize: '0.875rem',
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead style={{ borderBottom: '2px solid #d1d5db' }} {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      style={{
        padding: '0.5rem 0.75rem',
        textAlign: 'left',
        fontWeight: 600,
        fontSize: '0.875rem',
      }}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      style={{
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid #e5e7eb',
      }}
      {...props}
    >
      {children}
    </td>
  ),
  code: ({ children, className, ...props }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code
          style={{
            backgroundColor: '#f3f4f6',
            padding: '0.125rem 0.375rem',
            borderRadius: '0.25rem',
            fontSize: '0.875em',
            fontFamily: 'ui-monospace, monospace',
          }}
          className={className}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre
      style={{
        backgroundColor: '#1f2937',
        color: '#f9fafb',
        padding: '1rem',
        borderRadius: '0.5rem',
        overflowX: 'auto',
        fontSize: '0.875rem',
        fontFamily: 'ui-monospace, monospace',
        margin: '1rem 0',
      }}
      {...props}
    >
      {children}
    </pre>
  ),
  ul: ({ children, ...props }) => (
    <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0', listStyleType: 'disc' }} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol style={{ paddingLeft: '1.5rem', margin: '0.5rem 0', listStyleType: 'decimal' }} {...props}>
      {children}
    </ol>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      style={{
        borderLeft: '4px solid #d1d5db',
        paddingLeft: '1rem',
        margin: '1rem 0',
        color: '#6b7280',
        fontStyle: 'italic',
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),
}



/**
 * `<MathMarkdown>` — Unified Markdown + LaTeX rendering component.
 *
 * Uses KaTeX via rehype-katex for math rendering.
 * Normalizes LaTeX delimiters internally (`\\(…\\)` → `$…$`, `\\[…\\]` → `$$…$$`).
 *
 * @example
 * ```tsx
 * <MathMarkdown
 *   content="The formula \\(x^2 + y^2 = z^2\\) is famous."
 * />
 * ```
 */
export const MathMarkdown: React.FC<MathMarkdownProps> = ({
  content,
  className,
  components: userComponents,
}) => {
  const processedContent = React.useMemo(
    () => preprocessDelimiters(content),
    [content],
  )

  const mergedComponents = React.useMemo<Components>(
    () => ({
      ...defaultComponents,
      ...userComponents,
    }),
    [userComponents],
  )

  const remarkPlugins = React.useMemo(() => [remarkGfm, remarkMath], [])
  const rehypePlugins = React.useMemo(() => [rehypeKatex], [])

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={mergedComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
