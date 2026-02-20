import { default as React } from 'react';
import { MathMarkdownProps } from '../types';

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
export declare const MathMarkdown: React.FC<MathMarkdownProps>;
