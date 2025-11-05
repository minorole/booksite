'use client';

import React from 'react';
import { cn } from '@/lib/utils';

function linkify(text: string): Array<string | React.ReactElement> {
  const parts: Array<string | React.ReactElement> = [];
  const urlRe = /(https?:\/\/[^\s)]+)(\)?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[1];
    parts.push(
      <a
        key={parts.length}
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-ctp-blue break-words underline-offset-4 hover:underline"
      >
        {url}
      </a>,
    );
    last = urlRe.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function emphasize(text: string): Array<string | React.ReactElement> {
  // Very small **bold** emphasis; render in mauve to align to theme
  const segments: Array<string | React.ReactElement> = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push(text.slice(last, m.index));
    segments.push(
      <strong key={segments.length} className="text-ctp-mauve font-semibold">
        {m[1]}
      </strong>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) segments.push(text.slice(last));
  return segments;
}

function renderLine(line: string, idx: number): React.ReactElement {
  // Pattern: Label — Description (use em dash if present, fallback to hyphen-minus with spaces)
  const labelMatch = line.match(/^\s*([^—\-:]+)\s*(?:—|\s-\s)\s*(.+)$/);
  if (labelMatch) {
    const [, label, desc] = labelMatch;
    return (
      <p key={idx} className="leading-7">
        <span className="text-ctp-lavender font-medium">{label.trim()}</span>
        <span> — </span>
        {linkify(desc).map((t, i) =>
          typeof t === 'string' ? <React.Fragment key={i}>{emphasize(t)}</React.Fragment> : t,
        )}
      </p>
    );
  }
  return (
    <p key={idx} className="leading-7">
      {linkify(line).map((t, i) =>
        typeof t === 'string' ? <React.Fragment key={i}>{emphasize(t)}</React.Fragment> : t,
      )}
    </p>
  );
}

export function RichTextAuto({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/);
  let firstParaRendered = false;
  return (
    <div className={cn('space-y-3', className)}>
      {blocks.map((block, bi) => {
        const lines = block.split(/\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) return <div key={bi} />;

        // Bullet list if most lines start with "- "
        const bulletish = lines.every((l) => /^\s?-\s+/.test(l));
        if (bulletish) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5">
              {lines.map((l, i) => (
                <li key={i} className="marker:text-ctp-peach">
                  {renderLine(l.replace(/^\s?-\s+/, ''), i)}
                </li>
              ))}
            </ul>
          );
        }

        // Otherwise, render each line as a paragraph. First non-empty paragraph gets a subtle lead color.
        return (
          <div key={bi} className="space-y-1">
            {lines.map((l, li) => {
              const isLead = !firstParaRendered && l.trim().length > 0;
              const el = renderLine(l, li) as React.ReactElement<any>;
              if (isLead) {
                firstParaRendered = true;
                return React.cloneElement(
                  el,
                  {
                    className: cn((el.props as any).className, 'text-ctp-mauve font-medium'),
                  } as any,
                );
              }
              return el;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default RichTextAuto;
