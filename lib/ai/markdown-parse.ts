// Pure, dependency-free Markdown parser for AI assistant messages. Returns a
// small token/block tree that a React component renders into ELEMENTS (never
// HTML), so model output can't inject markup. Kept React-free so it is unit
// testable in isolation. Supports: **bold**/__bold__, *italic*/_italic_,
// `inline code`, bullet lists (- / *), numbered lists (1.), paragraphs + breaks.

export type Inline =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string };

export type Block =
  | { type: "p"; lines: Inline[][] }   // one entry per source line (rendered with <br/> between)
  | { type: "ul"; items: Inline[][] }
  | { type: "ol"; items: Inline[][] };

const INLINE_RE = /(\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*\n]+)\*|_([^_\n]+)_)/g;
const UL = /^\s*[-*]\s+/;
const OL = /^\s*\d+\.\s+/;

/** Split one line into inline tokens (bold → italic → code, single level). */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    const bold = m[2] ?? m[3];
    const code = m[4];
    const italic = m[5] ?? m[6];
    if (bold != null) out.push({ type: "bold", value: bold });
    else if (code != null) out.push({ type: "code", value: code });
    else out.push({ type: "italic", value: italic! });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/** Parse the whole message into block-level structure. */
export function parseBlocks(text: string): Block[] {
  const lines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    if (UL.test(lines[i])) {
      const items: Inline[][] = [];
      while (i < lines.length && UL.test(lines[i])) items.push(parseInline(lines[i++].replace(UL, "")));
      blocks.push({ type: "ul", items });
      continue;
    }
    if (OL.test(lines[i])) {
      const items: Inline[][] = [];
      while (i < lines.length && OL.test(lines[i])) items.push(parseInline(lines[i++].replace(OL, "")));
      blocks.push({ type: "ol", items });
      continue;
    }
    const lineTokens: Inline[][] = [];
    while (i < lines.length && lines[i].trim() && !UL.test(lines[i]) && !OL.test(lines[i])) {
      lineTokens.push(parseInline(lines[i++]));
    }
    blocks.push({ type: "p", lines: lineTokens });
  }
  return blocks;
}
