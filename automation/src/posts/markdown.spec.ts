import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders ordinary markdown', () => {
    const html = renderMarkdown('## Title\n\n**bold**');

    expect(html).toMatch(/<h2[^>]*>Title<\/h2>/);
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders an image', () => {
    const html = renderMarkdown('![alt text](/uploads/a.png)');

    expect(html).toContain('src="/uploads/a.png"');
    expect(html).toContain('alt="alt text"');
  });

  it('gives article images a loading skeleton and defers them', () => {
    const html = renderMarkdown('![alt text](/uploads/a.png)');

    expect(html).toContain('class="skel"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it('keeps a title when one is given, and omits it when not', () => {
    expect(renderMarkdown('![a](/uploads/a.png "A caption")')).toContain(
      'title="A caption"',
    );
    expect(renderMarkdown('![a](/uploads/a.png)')).not.toContain('title=');
  });

  it('escapes an image built from untrusted text', () => {
    const html = renderMarkdown(
      '![" onerror="alert(1)](/uploads/a.png?x="&y=1)',
    );

    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain('&quot;');
    expect(html).toContain('&amp;y=1');
  });

  it('builds a two column block', () => {
    const html = renderMarkdown(
      ':::columns\n![left](/uploads/a.png)\n|||\nSome **text**\n:::',
    );

    expect(html).toContain('class="md-columns"');
    expect(html).toContain('data-cols="2"');
    expect(html.match(/class="md-col"/g)).toHaveLength(2);
    expect(html).toContain('/uploads/a.png');
    expect(html).toContain('<strong>text</strong>');
  });

  it('builds an image and image column block', () => {
    const html = renderMarkdown(
      ':::columns\n![a](/uploads/a.png)\n|||\n![b](/uploads/b.png)\n:::',
    );

    expect(html).toContain('data-cols="2"');
    expect(html).toContain('/uploads/a.png');
    expect(html).toContain('/uploads/b.png');
  });

  it('supports three columns', () => {
    const html = renderMarkdown(':::columns\nA\n|||\nB\n|||\nC\n:::');

    expect(html).toContain('data-cols="3"');
    expect(html.match(/class="md-col"/g)).toHaveLength(3);
  });

  it('does not build a grid for a block with no separator', () => {
    const html = renderMarkdown(':::columns\nJust one cell\n:::');

    expect(html).not.toContain('md-columns');
    expect(html).toContain('Just one cell');
  });

  it('renders markdown around a column block', () => {
    const html = renderMarkdown(
      'Intro paragraph\n\n:::columns\nA\n|||\nB\n:::\n\n## After',
    );

    expect(html).toContain('Intro paragraph');
    expect(html).toContain('md-columns');
    expect(html).toMatch(/<h2[^>]*>After<\/h2>/);
  });

  it('handles several column blocks in one post', () => {
    const html = renderMarkdown(
      ':::columns\nA\n|||\nB\n:::\n\ntext\n\n:::columns\nC\n|||\nD\n:::',
    );

    expect(html.match(/class="md-columns"/g)).toHaveLength(2);
  });

  it('leaves an unclosed block alone rather than swallowing the rest', () => {
    const html = renderMarkdown(':::columns\nA\n|||\nB\n\nmore text');

    expect(html).not.toContain('md-columns');
    expect(html).toContain('more text');
  });

  it('handles empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  describe('plain text', () => {
    it('keeps the line breaks the author typed', () => {
      const html = renderMarkdown('First line\nSecond line\nThird line');

      expect(html.match(/<br\s*\/?>/g)).toHaveLength(2);
      expect(html).toContain('First line');
      expect(html).toContain('Third line');
    });

    it('keeps line breaks typed on Windows, which submit as CRLF', () => {
      expect(renderMarkdown('First line\r\nSecond line')).toMatch(/<br\s*\/?>/);
    });

    it('still starts a new paragraph on a blank line', () => {
      const html = renderMarkdown('One\n\nTwo');

      expect(html.match(/<p>/g)).toHaveLength(2);
      expect(html).not.toMatch(/<br\s*\/?>/);
    });

    it('does not break lines inside a code block', () => {
      const html = renderMarkdown('```js\nconst a = 1;\nconst b = 2;\n```');

      expect(html).not.toMatch(/<br\s*\/?>/);
      expect(html).toContain('<code');
    });

    it('leaves list items as items rather than breaking within them', () => {
      const html = renderMarkdown('- one\n- two');

      expect(html.match(/<li>/g)).toHaveLength(2);
      expect(html).not.toMatch(/<br\s*\/?>/);
    });

    it('renders a heading written straight after a line of prose', () => {
      const html = renderMarkdown('Intro line\n## Heading');

      expect(html).toMatch(/<h2[^>]*>Heading<\/h2>/);
    });
  });
});
