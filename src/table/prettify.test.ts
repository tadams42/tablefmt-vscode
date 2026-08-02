import { describe, it, expect } from 'vitest';
import { preprocess, postprocess, bareLine } from './prettify.js';

describe('preprocess', () => {
  it('no indent, no comment', () => {
    const [, meta] = preprocess('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(meta.preCommentSpaces).toBe(0);
    expect(meta.comment).toBeNull();
  });

  it('leading spaces use the common indent', () => {
    const [, meta] = preprocess('  | a |\n    | b |');
    expect(meta.preCommentSpaces).toBe(2);
  });

  it('indent beyond the common prefix stays on the bare line', () => {
    const [lines] = preprocess('  | a |\n    | b |');
    expect(lines).toEqual(['| a |', '  | b |']);
  });

  // psql/rst pad the first column with a space; that is content, not indent.
  it('a borderless style is not read as indented', () => {
    const [lines, meta] = preprocess(' item | qty \n------+-----\n spam |  42 ');
    expect(meta.preCommentSpaces).toBe(0);
    expect(lines[0]).toBe(' item | qty ');
  });

  it('blank lines do not drag the common indent to zero', () => {
    const [, meta] = preprocess('    | a |\n\n    | b |');
    expect(meta.preCommentSpaces).toBe(4);
  });

  it('comment spacing uses the common indent too', () => {
    const [lines, meta] = preprocess('#  a\n# b');
    expect(meta.postCommentSpaces).toBe(1);
    expect(lines).toEqual([' a', 'b']);
  });

  it('tabs count as two', () => {
    const [, meta] = preprocess('\t| a |');
    expect(meta.preCommentSpaces).toBe(2);
  });

  it('comment prefix hash', () => {
    const [, meta] = preprocess('# | row |');
    expect(meta.comment).toBe('#');
    expect(meta.postCommentSpaces).toBeGreaterThanOrEqual(1);
  });

  it('comment prefix double-slash', () => {
    const [, meta] = preprocess('// | row |');
    expect(meta.comment).toBe('//');
  });

  it('comment prefix triple-slash preferred over double-slash', () => {
    const [, meta] = preprocess('/// | row |');
    expect(meta.comment).toBe('///');
  });

  it('comment prefix star', () => {
    const [, meta] = preprocess('* | row |');
    expect(meta.comment).toBe('*');
  });

  it('strips indent and comment from bare lines', () => {
    const [lines] = preprocess('  # | a | b |');
    expect(lines[0]).toBe('| a | b |');
  });

  it('indent before and after comment', () => {
    const [, meta] = preprocess('   #  | row |');
    expect(meta.preCommentSpaces).toBe(3);
    expect(meta.comment).toBe('#');
    expect(meta.postCommentSpaces).toBe(2);
  });

  it('partial comment: mixed prefixed and plain lines', () => {
    const [, meta] = preprocess('| a |\n# | b |');
    expect(meta.comment).toBe('#');
  });
});

describe('postprocess', () => {
  it('round-trips prefix', () => {
    const meta = { preCommentSpaces: 2, comment: '#', postCommentSpaces: 1 };
    const rendered = '| a | b |\n|---|---|\n| 1 | 2 |\n';
    const out = postprocess(rendered, meta);
    for (const line of out.split('\n').filter(l => l !== '')) {
      expect(line).toMatch(/^  # /);
    }
  });

  it('preserves trailing newline', () => {
    const meta = { preCommentSpaces: 0, comment: null, postCommentSpaces: 0 };
    expect(postprocess('a\nb\n', meta)).toMatch(/\n$/);
  });

  it('no trailing newline when input lacks one', () => {
    const meta = { preCommentSpaces: 0, comment: null, postCommentSpaces: 0 };
    expect(postprocess('a\nb', meta)).not.toMatch(/\n$/);
  });

  it('enforces min 1 space after comment', () => {
    const meta = { preCommentSpaces: 0, comment: '#', postCommentSpaces: 0 };
    const out = postprocess('x\n', meta);
    expect(out).toMatch(/^# /);
  });
});

describe('bareLine', () => {
  it('strips double-slash prefix', () => {
    expect(bareLine('// | a | b |')).toBe('| a | b |');
  });

  it('strips indentation and comment', () => {
    expect(bareLine('  # | a |')).toBe('| a |');
  });

  it('returns plain line unchanged', () => {
    expect(bareLine('| a | b |')).toBe('| a | b |');
  });
});
