"use client";

// Renders AI assistant messages with SAFE Markdown support. The model emits
// Markdown (**bold**, lists, etc.); rendering it as plain text showed the raw
// asterisks. Parsing happens in lib/ai/markdown-parse (React-free + unit tested);
// here we turn the token tree into React ELEMENTS — React escapes all text, so
// any raw HTML in the model output is shown literally and can NEVER execute
// (no dangerouslySetInnerHTML, nothing to sanitize).

import React from "react";
import { parseBlocks, type Inline } from "@/lib/ai/markdown-parse";

function renderInline(tokens: Inline[], keyPrefix: string): React.ReactNode[] {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}-${i}`;
    if (t.type === "bold") return <strong key={key} className="font-semibold text-slate-900">{t.value}</strong>;
    if (t.type === "italic") return <em key={key}>{t.value}</em>;
    if (t.type === "code") return <code key={key} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] font-mono text-slate-700">{t.value}</code>;
    return <React.Fragment key={key}>{t.value}</React.Fragment>;
  });
}

export function AssistantMarkdown({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={className ?? "space-y-1.5"}>
      {blocks.map((b, bi) => {
        if (b.type === "ul") {
          return (
            <ul key={bi} className="list-disc space-y-0.5 pl-5">
              {b.items.map((it, j) => <li key={j}>{renderInline(it, `u${bi}-${j}`)}</li>)}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={bi} className="list-decimal space-y-0.5 pl-5">
              {b.items.map((it, j) => <li key={j}>{renderInline(it, `o${bi}-${j}`)}</li>)}
            </ol>
          );
        }
        return (
          <p key={bi} className="leading-relaxed">
            {b.lines.flatMap((line, j) => [
              ...(j > 0 ? [<br key={`br${bi}-${j}`} />] : []),
              ...renderInline(line, `p${bi}-${j}`),
            ])}
          </p>
        );
      })}
    </div>
  );
}
