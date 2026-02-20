/**
 * Preprocess LaTeX delimiters in a markdown string for KaTeX rendering.
 *
 * Converts `\(...\)` → `$...$` and `\[...\]` → `$$...$$` so that
 * remark-math + rehype-katex can process them.
 *
 * Content inside fenced code blocks is never transformed.
 */
export declare function preprocessDelimiters(content: string): string;
