import { useState } from 'react';

const CHAR_LIMIT = 300;

interface TruncatedTextProps {
  content: string;
  className?: string;
}

export default function TruncatedText({ content, className = '' }: TruncatedTextProps) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = content.length > CHAR_LIMIT;

  return (
    <div className={`overflow-hidden ${className}`}>
      <p className="text-gray-700 break-words whitespace-pre-wrap">
        {expanded || !needsTruncation ? content : `${content.slice(0, CHAR_LIMIT)}...`}
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
