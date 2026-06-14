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

export function preprocess(input: string): [string[], PrettifyMeta] {
  let maxPre = 0;
  let firstComment: string | null = null;
  let maxPost = 0;
  const bareLines: string[] = [];

  for (const line of input.split('\n')) {
    const [preSpaces, afterWs] = measureLeadingWs(line);
    let commentFound: string | null = null;
    for (const prefix of COMMENT_PREFIXES) {
      if (afterWs.startsWith(prefix)) { commentFound = prefix; break; }
    }

    let bare: string;
    if (commentFound !== null) {
      const afterComment = afterWs.slice(commentFound.length);
      const [postSpaces, content] = measureLeadingWs(afterComment);
      maxPost = Math.max(maxPost, postSpaces);
      if (firstComment === null) firstComment = commentFound;
      bare = content;
    } else {
      bare = afterWs;
    }

    maxPre = Math.max(maxPre, preSpaces);
    bareLines.push(bare);
  }

  return [bareLines, { preCommentSpaces: maxPre, comment: firstComment, postCommentSpaces: maxPost }];
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
