import { clipWords, shareHeadline, shareMeta } from './share';

describe('share', () => {
  describe('clipWords', () => {
    it('keeps short text as is', () => {
      expect(clipWords('One request, one id.')).toBe('One request, one id.');
    });

    it('collapses whitespace', () => {
      expect(clipWords('  a \n b   c ')).toBe('a b c');
    });

    it('clips to the word limit and adds an ellipsis', () => {
      expect(clipWords('one two three four', 2)).toBe('one two…');
    });

    it('drops trailing punctuation before the ellipsis', () => {
      expect(clipWords('one two, three', 2)).toBe('one two…');
    });

    it('defaults to 40 words', () => {
      const text = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
      const clipped = clipWords(text);

      expect(clipped.split(' ')).toHaveLength(40);
      expect(clipped.endsWith('w39…')).toBe(true);
    });
  });

  describe('shareHeadline', () => {
    it('joins the title and the short description', () => {
      expect(shareHeadline('Logging', 'One request, one id.')).toBe(
        'Logging — One request, one id.',
      );
    });

    it('falls back to the title when there is no description', () => {
      expect(shareHeadline('Logging', '')).toBe('Logging');
      expect(shareHeadline('Logging')).toBe('Logging');
    });

    it('strips markdown emphasis and code marks from the description', () => {
      expect(
        shareHeadline('Logging', 'on record.** Uses `CorrelationId` and *Seq*'),
      ).toBe('Logging — on record. Uses CorrelationId and Seq');
    });

    it('does not repeat a description equal to the title', () => {
      expect(shareHeadline('Logging', ' logging ')).toBe('Logging');
    });
  });

  describe('shareMeta', () => {
    it('joins the parts that are present', () => {
      expect(shareMeta(['5 min read', undefined, false, 'by Me'])).toBe(
        '5 min read · by Me',
      );
    });
  });
});
