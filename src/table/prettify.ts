export interface PrettifyMeta {
  preCommentSpaces: number;
  comment: string | null;
  postCommentSpaces: number;
}

const COMMENT_PREFIXES = ['///', '//', '#', '*'] as const;

function measureLeadingWs(s: string): [number, string] {
  let spaces = 0;
  let i = 0;
  while (i < s.length) {
    if (s[i] === '\t') { spaces += 2; i++; }
    else if (s[i] === ' ') { spaces++; i++; }
    else break;
  }
  return [spaces, s.slice(i)];
}

interface SplitLine {
  preSpaces: number;
  comment: string | null;
  postSpaces: number;
  content: string;
}

function splitLine(line: string): SplitLine {
  const [preSpaces, afterWs] = measureLeadingWs(line);
  const comment = COMMENT_PREFIXES.find(p => afterWs.startsWith(p)) ?? null;
  if (comment === null) return { preSpaces, comment: null, postSpaces: 0, content: afterWs };
  const [postSpaces, content] = measureLeadingWs(afterWs.slice(comment.length));
  return { preSpaces, comment, postSpaces, content };
}

function minOr(values: number[], fallback: number): number {
  return values.length === 0 ? fallback : Math.min(...values);
}

/**
 * Strips indentation and comment prefixes, returning the bare table lines plus
 * what has to be restored afterwards.
 *
 * The prefix is the *common* indent, not the deepest one. Styles that draw no
 * left border (`psql`, `rst`) pad their first column with a leading space, so
 * taking the maximum read that padding as indentation and every reformat
 * pushed the table one column further right. Whatever a line is indented
 * beyond the common prefix is kept on the bare line, so column positions stay
 * intact — RST parsing slices cells by character offset and depends on it.
 */
export function preprocess(input: string): [string[], PrettifyMeta] {
  const split = input.split('\n').map(splitLine);
  const contentful = split.filter(s => s.content !== '');

  const minPre = minOr(contentful.map(s => s.preSpaces), 0);
  const minPost = minOr(contentful.filter(s => s.comment !== null).map(s => s.postSpaces), 0);
  const firstComment = split.find(s => s.comment !== null)?.comment ?? null;

  const bareLines = split.map(s => {
    if (s.content === '') return '';
    const extra = s.comment === null ? s.preSpaces - minPre : s.postSpaces - minPost;
    return ' '.repeat(Math.max(0, extra)) + s.content;
  });

  return [bareLines, { preCommentSpaces: minPre, comment: firstComment, postCommentSpaces: minPost }];
}

export function bareLine(line: string): string {
  const [, afterWs] = measureLeadingWs(line);
  for (const prefix of COMMENT_PREFIXES) {
    if (afterWs.startsWith(prefix)) {
      const [, content] = measureLeadingWs(afterWs.slice(prefix.length));
      return content;
    }
  }
  return afterWs;
}

export function postprocess(rendered: string, meta: PrettifyMeta): string {
  const endsWithNewline = rendered.endsWith('\n');
  const pre = ' '.repeat(meta.preCommentSpaces);
  const postSuffix = meta.comment === null
    ? ''
    : meta.comment + ' '.repeat(Math.max(1, meta.postCommentSpaces));
  const prefix = pre + postSuffix;

  const lines = endsWithNewline
    ? rendered.slice(0, -1).split('\n')
    : rendered.split('\n');
  const prefixed = lines.map(line => prefix + line).join('\n');
  return endsWithNewline ? prefixed + '\n' : prefixed;
}
