import { describe, it, expect } from 'vitest'
import { preprocessDelimiters } from '../delimiters'

describe('preprocessDelimiters', () => {
  it('should convert inline math to dollar signs', () => {
    const input = 'The formula \\(x^2\\) is here'
    const result = preprocessDelimiters(input)
    expect(result).toBe('The formula $x^2$ is here')
  })

  it('should convert display math to double dollar signs', () => {
    const input = 'Display: \\[E = mc^2\\]'
    const result = preprocessDelimiters(input)
    expect(result).toBe('Display: $$E = mc^2$$')
  })

  it('should handle multiple inline math expressions', () => {
    const input = '\\(a\\) and \\(b\\) and \\(c\\)'
    const result = preprocessDelimiters(input)
    expect(result).toBe('$a$ and $b$ and $c$')
  })

  it('should not transform content inside code fences', () => {
    const input = 'Before \\(math\\)\n```\n\\(code\\)\n```\nAfter \\(math\\)'
    const result = preprocessDelimiters(input)
    expect(result).toContain('$math$')
    expect(result).toContain('\\(code\\)')
  })

  it('should handle empty content', () => {
    expect(preprocessDelimiters('')).toBe('')
  })

  it('should handle multiline display math', () => {
    const input = '\\[\n  a + b\n  = c\n\\]'
    const result = preprocessDelimiters(input)
    expect(result).toBe('$$\n  a + b\n  = c\n$$')
  })

  it('should handle content with no math', () => {
    const input = 'Just regular text'
    expect(preprocessDelimiters(input)).toBe('Just regular text')
  })

  it('should handle mixed inline and display math', () => {
    const input = 'Inline \\(a+b\\) and display \\[c+d\\]'
    const result = preprocessDelimiters(input)
    expect(result).toBe('Inline $a+b$ and display $$c+d$$')
  })
})
