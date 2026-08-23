import React from 'react';

/**
 * Minimal, dependency-free Markdown renderer for AI chat responses.
 *
 * Builds React elements directly rather than injecting an HTML string, so
 * there is no dangerouslySetInnerHTML and therefore nothing for a crafted
 * response to inject — deliberate given this renders live LLM output.
 * Covers what Chamber AI actually produces (headers, bold/italic, inline
 * code, fenced code blocks, lists, paragraphs) — not full CommonMark.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*|_(.+?)_/;

  while (remaining.length > 0) {
    const match = remaining.match(pattern);
    if (!match || match.index === undefined) {
      nodes.push(remaining);
      break;
    }
    if (match.index > 0) {
      nodes.push(remaining.slice(0, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${key++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(
        <code key={`${keyPrefix}-${key++}`} className="px-1 py-0.5 rounded bg-gray-100 text-amber-700 text-[0.85em]">
          {match[2]}
        </code>
      );
    } else {
      nodes.push(<em key={`${keyPrefix}-${key++}`}>{match[3] ?? match[4]}</em>);
    }
    remaining = remaining.slice(match.index + match[0].length);
  }
  return nodes;
}

const HEADER_RE = /^(#{1,3})\s+(.*)$/;
const LIST_ITEM_RE = /^\s*([-*]|\d+\.)\s+(.*)$/;

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence, if present
      blocks.push(
        <pre key={`b-${blockKey++}`} className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto text-sm my-2">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const headerMatch = line.match(HEADER_RE);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const Tag = (level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5') as keyof JSX.IntrinsicElements;
      const sizeClass = level === 1 ? 'text-lg font-bold' : level === 2 ? 'text-base font-bold' : 'text-sm font-semibold';
      blocks.push(
        <Tag key={`b-${blockKey}`} className={`${sizeClass} mt-3 mb-1 text-gray-900`}>
          {renderInline(headerMatch[2], `h-${blockKey}`)}
        </Tag>
      );
      blockKey++;
      i++;
      continue;
    }

    if (LIST_ITEM_RE.test(line)) {
      const firstMarker = line.match(LIST_ITEM_RE)![1];
      const ordered = /\d+\./.test(firstMarker);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_ITEM_RE);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      const ListTag = (ordered ? 'ol' : 'ul') as keyof JSX.IntrinsicElements;
      blocks.push(
        <ListTag key={`b-${blockKey}`} className={ordered ? 'list-decimal ml-5 my-2 space-y-1' : 'list-disc ml-5 my-2 space-y-1'}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li-${blockKey}-${idx}`)}</li>
          ))}
        </ListTag>
      );
      blockKey++;
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !HEADER_RE.test(lines[i]) &&
      !LIST_ITEM_RE.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`b-${blockKey}`} className="my-1.5 leading-relaxed">
        {paraLines.map((l, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInline(l, `p-${blockKey}-${idx}`)}
          </React.Fragment>
        ))}
      </p>
    );
    blockKey++;
  }

  return <div className="text-sm text-gray-800 [&>*:first-child]:mt-0">{blocks}</div>;
}
