import React from 'react';

/**
 * Parses bold (*text*), italic (_text_), strike (~text~), inline code (`code`),
 * bullet points, and URLs in chat messages safely without external heavy markdown dependencies.
 */
export function renderFormattedChatMessage(text: string): React.ReactNode {
  if (!text) return null;

  // Split into lines to preserve newlines and bullet formatting
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const isBullet = line.trim().startsWith('• ') || line.trim().startsWith('- ');
        const processedLine = isBullet ? line.trim().substring(2) : line;

        // Parse inline markers: URLs, *bold*, _italic_, `code`, ~strike~
        const parts = parseInlineFormatting(processedLine);

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1">
              <span className="text-[#F27D26] font-bold text-xs shrink-0 mt-0.5">•</span>
              <span>{parts}</span>
            </div>
          );
        }

        return <div key={lineIdx}>{parts}</div>;
      })}
    </div>
  );
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  // Regex to match URLs, *bold*, _italic_, `code`, ~strike~
  const tokenRegex = /(https?:\/\/[^\s]+)|(\*[^*\n]+\*)|(_[^_\n]+_)|(`[^`\n]+`)|(~[^~\n]+~)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    if (match[1]) {
      // URL
      nodes.push(
        <a
          key={match.index}
          href={matchedStr}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold hover:opacity-80 break-all text-blue-400 dark:text-blue-300"
          onClick={(e) => e.stopPropagation()}
        >
          {matchedStr.length > 40 ? `${matchedStr.substring(0, 37)}...` : matchedStr}
        </a>
      );
    } else if (match[2]) {
      // *Bold*
      const content = matchedStr.slice(1, -1);
      nodes.push(<strong key={match.index} className="font-extrabold">{content}</strong>);
    } else if (match[3]) {
      // _Italic_
      const content = matchedStr.slice(1, -1);
      nodes.push(<em key={match.index} className="italic opacity-90">{content}</em>);
    } else if (match[4]) {
      // `Code`
      const content = matchedStr.slice(1, -1);
      nodes.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-black/20 dark:bg-white/10 font-mono text-[11px] font-bold"
        >
          {content}
        </code>
      );
    } else if (match[5]) {
      // ~Strike~
      const content = matchedStr.slice(1, -1);
      nodes.push(<span key={match.index} className="line-through opacity-70">{content}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

/**
 * Date header grouping for message timeline
 */
export function formatChatDateGroup(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Yesterday';

    // Within current year
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

/**
 * Returns true if message A and message B are on different calendar days
 */
export function isDifferentChatDay(prevDateStr?: string, currDateStr?: string): boolean {
  if (!prevDateStr || !currDateStr) return true;
  try {
    const d1 = new Date(prevDateStr);
    const d2 = new Date(currDateStr);
    return (
      d1.getFullYear() !== d2.getFullYear() ||
      d1.getMonth() !== d2.getMonth() ||
      d1.getDate() !== d2.getDate()
    );
  } catch {
    return false;
  }
}
