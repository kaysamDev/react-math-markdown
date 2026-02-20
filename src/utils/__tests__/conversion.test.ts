import { describe, it, expect } from 'vitest'
import { markdownToDraftState } from '../markdownToDraft'
import { draftStateToMarkdown } from '../draftToMarkdown'

describe('markdownToDraftState', () => {
  describe('block types', () => {
    it('should parse header-one', () => {
      const state = markdownToDraftState('# Hello')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getType()).toBe('header-one')
      expect(block.getText()).toBe('Hello')
    })

    it('should parse header-two', () => {
      const state = markdownToDraftState('## World')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getType()).toBe('header-two')
      expect(block.getText()).toBe('World')
    })

    it('should parse header-three through header-six', () => {
      for (let level = 3; level <= 6; level++) {
        const md = `${'#'.repeat(level)} Heading ${level}`
        const state = markdownToDraftState(md)
        const block = state.getCurrentContent().getFirstBlock()
        expect(block.getType()).toBe(
          `header-${['', 'one', 'two', 'three', 'four', 'five', 'six'][level]}`,
        )
      }
    })

    it('should parse unordered list items', () => {
      const state = markdownToDraftState('- Item one\n- Item two')
      const blocks = state.getCurrentContent().getBlocksAsArray()
      expect(blocks).toHaveLength(2)
      expect(blocks[0].getType()).toBe('unordered-list-item')
      expect(blocks[0].getText()).toBe('Item one')
      expect(blocks[1].getType()).toBe('unordered-list-item')
      expect(blocks[1].getText()).toBe('Item two')
    })

    it('should parse ordered list items', () => {
      const state = markdownToDraftState('1. First\n2. Second')
      const blocks = state.getCurrentContent().getBlocksAsArray()
      expect(blocks).toHaveLength(2)
      expect(blocks[0].getType()).toBe('ordered-list-item')
      expect(blocks[0].getText()).toBe('First')
    })

    it('should parse blockquote', () => {
      const state = markdownToDraftState('> Quote here')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getType()).toBe('blockquote')
      expect(block.getText()).toBe('Quote here')
    })

    it('should parse code blocks', () => {
      const md = '```\nconst x = 1;\nconsole.log(x);\n```'
      const state = markdownToDraftState(md)
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getType()).toBe('code-block')
      expect(block.getText()).toBe('const x = 1;\nconsole.log(x);')
    })

    it('should parse unstyled text', () => {
      const state = markdownToDraftState('Just some text')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getType()).toBe('unstyled')
      expect(block.getText()).toBe('Just some text')
    })
  })

  describe('inline styles', () => {
    it('should parse bold text', () => {
      const state = markdownToDraftState('Some **bold** text')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toBe('Some bold text')
      // Characters 5-8 should be bold
      expect(block.getInlineStyleAt(4).has('BOLD')).toBe(false) // space before
      expect(block.getInlineStyleAt(5).has('BOLD')).toBe(true) // 'b'
      expect(block.getInlineStyleAt(8).has('BOLD')).toBe(true) // 'd'
      expect(block.getInlineStyleAt(9).has('BOLD')).toBe(false) // space after
    })

    it('should parse italic text', () => {
      const state = markdownToDraftState('Some *italic* text')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toBe('Some italic text')
      expect(block.getInlineStyleAt(5).has('ITALIC')).toBe(true)
    })

    it('should parse underline text', () => {
      const state = markdownToDraftState('Some <u>underlined</u> text')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toBe('Some underlined text')
      expect(block.getInlineStyleAt(5).has('UNDERLINE')).toBe(true)
    })

    it('should parse strikethrough text', () => {
      const state = markdownToDraftState('Some ~~struck~~ text')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toBe('Some struck text')
      expect(block.getInlineStyleAt(5).has('STRIKETHROUGH')).toBe(true)
    })

    it('should parse inline code', () => {
      const state = markdownToDraftState('Use `const` here')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toBe('Use const here')
      expect(block.getInlineStyleAt(4).has('CODE')).toBe(true)
    })

    it('should parse bold-italic (***)', () => {
      const state = markdownToDraftState('Some ***bold italic*** text')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toBe('Some bold italic text')
      expect(block.getInlineStyleAt(5).has('BOLD')).toBe(true)
      expect(block.getInlineStyleAt(5).has('ITALIC')).toBe(true)
    })

    it('should handle multiple inline styles in one line', () => {
      const state = markdownToDraftState('**bold** and *italic* here')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toBe('bold and italic here')
      expect(block.getInlineStyleAt(0).has('BOLD')).toBe(true)
      expect(block.getInlineStyleAt(9).has('ITALIC')).toBe(true)
    })
  })

  describe('LaTeX preservation', () => {
    it('should preserve inline LaTeX delimiters as text', () => {
      const state = markdownToDraftState('The equation \\(x^2 + y^2 = z^2\\) is important')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toContain('\\(x^2 + y^2 = z^2\\)')
    })

    it('should preserve display LaTeX delimiters as text', () => {
      const state = markdownToDraftState('\\[E = mc^2\\]')
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toContain('\\[E = mc^2\\]')
    })
  })

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const state = markdownToDraftState('')
      const blocks = state.getCurrentContent().getBlocksAsArray()
      expect(blocks.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle null-ish content', () => {
      const state = markdownToDraftState('')
      expect(state).toBeDefined()
    })

    it('should detect JSON-serialized Draft.js content', () => {
      const draftJson = JSON.stringify({
        blocks: [
          {
            key: 'abc',
            type: 'unstyled',
            text: 'Hello from JSON',
            depth: 0,
            inlineStyleRanges: [],
            entityRanges: [],
            data: {},
          },
        ],
        entityMap: {},
      })
      const state = markdownToDraftState(draftJson)
      const block = state.getCurrentContent().getFirstBlock()
      expect(block.getText()).toBe('Hello from JSON')
    })

    it('should handle content with only whitespace', () => {
      const state = markdownToDraftState('   ')
      expect(state).toBeDefined()
    })
  })
})

describe('draftStateToMarkdown', () => {
  // Helper to create a draft state from markdown and convert back
  function roundTrip(md: string): string {
    const state = markdownToDraftState(md)
    return draftStateToMarkdown(state)
  }

  describe('block types', () => {
    it('should convert header-one', () => {
      expect(roundTrip('# Hello')).toBe('# Hello')
    })

    it('should convert header-two', () => {
      expect(roundTrip('## World')).toBe('## World')
    })

    it('should convert unordered list', () => {
      const result = roundTrip('- Item one\n- Item two')
      expect(result).toContain('- Item one')
      expect(result).toContain('- Item two')
    })

    it('should convert ordered list', () => {
      const result = roundTrip('1. First\n2. Second')
      expect(result).toContain('1. First')
      expect(result).toContain('1. Second') // Draft.js doesn't track numbers
    })

    it('should convert blockquote', () => {
      expect(roundTrip('> Quote here')).toBe('> Quote here')
    })

    it('should convert code blocks', () => {
      const input = '```\nconst x = 1;\n```'
      const result = roundTrip(input)
      expect(result).toContain('```')
      expect(result).toContain('const x = 1;')
    })
  })

  describe('inline styles', () => {
    it('should convert bold text', () => {
      expect(roundTrip('**bold**')).toBe('**bold**')
    })

    it('should convert italic text', () => {
      expect(roundTrip('*italic*')).toBe('*italic*')
    })

    it('should convert underline text', () => {
      expect(roundTrip('<u>underlined</u>')).toBe('<u>underlined</u>')
    })

    it('should convert strikethrough text', () => {
      expect(roundTrip('~~struck~~')).toBe('~~struck~~')
    })

    it('should convert inline code', () => {
      expect(roundTrip('`code`')).toBe('`code`')
    })
  })

  describe('round-trip fidelity', () => {
    it('should round-trip headers with inline styles', () => {
      const input = '## **Bold** heading'
      const result = roundTrip(input)
      expect(result).toBe('## **Bold** heading')
    })

    it('should round-trip content with LaTeX', () => {
      const input = 'The equation \\(x^2\\) is here'
      const result = roundTrip(input)
      expect(result).toContain('\\(x^2\\)')
    })

    it('should round-trip multiple paragraphs', () => {
      const input = 'First paragraph\nSecond paragraph'
      const result = roundTrip(input)
      expect(result).toContain('First paragraph')
      expect(result).toContain('Second paragraph')
    })

    it('should round-trip mixed block types', () => {
      const input = '# Title\n\nSome text\n\n- List item'
      const result = roundTrip(input)
      expect(result).toContain('# Title')
      expect(result).toContain('- List item')
    })

    it('should round-trip table-like content', () => {
      const input = '| Col1 | Col2 |\n| --- | --- |\n| A | B |'
      const result = roundTrip(input)
      expect(result).toContain('| Col1 | Col2 |')
      expect(result).toContain('| A | B |')
    })
  })

  describe('edge cases', () => {
    it('should handle bold followed by italic', () => {
      const input = '**bold** and *italic*'
      const result = roundTrip(input)
      expect(result).toContain('**bold**')
      expect(result).toContain('*italic*')
    })

    it('should handle empty editor state', () => {
      const state = markdownToDraftState('')
      const result = draftStateToMarkdown(state)
      expect(typeof result).toBe('string')
    })
  })
})
