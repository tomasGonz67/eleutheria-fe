import { useState } from 'react';

const CHAR_LIMIT = 300;

/** Collapse 3+ consecutive newlines into 2 and trim leading/trailing whitespace */
function collapseNewlines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

interface TruncatedTextProps {
  content: string;
  className?: string;
}

export default function TruncatedText({ content, className = '' }: TruncatedTextProps) {
  const [expanded, setExpanded] = useState(false);
  const sanitized = collapseNewlines(content);
  const needsTruncation = sanitized.length > CHAR_LIMIT;

  return (
    <div className={`overflow-hidden ${className}`}>
      <p className="text-gray-700 break-words whitespace-pre-wrap max-h-[250px] overflow-y-auto">
        {expanded || !needsTruncation ? sanitized : `${sanitized.slice(0, CHAR_LIMIT)}...`}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-semibold mt-1 hover:underline"
          style={{ color: '#AA633F' }}
        >
          {expanded ? 'Show less' : 'View more'}
        </button>
      )}
    </div>
  );
}
