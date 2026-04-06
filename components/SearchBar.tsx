import { useState, FormEvent } from 'react';

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  accentClass?: string;
}

export default function SearchBar({
  initialQuery = '',
  onSearch,
  onClear,
  placeholder = 'Search...',
  accentClass = 'bg-accent-chat hover:bg-accent-chat-hover',
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery.trim());
  };

  const handleClear = () => {
    setSearchQuery('');
    onClear();
  };

  return (
    <>
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-2 pr-10 border-2 border-border text-text-primary bg-surface rounded-lg focus:border-border-strong focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-tertiary"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className={`px-6 py-2 text-text-on-color rounded-lg transition font-semibold ${accentClass}`}
          >
            Search
          </button>
        </div>
      </form>

      {/* Search Indicator */}
      {initialQuery && (
        <div className="mb-4 flex items-center gap-2 text-text-tertiary">
          <span>Searching for: <strong>{initialQuery}</strong></span>
          <button
            onClick={handleClear}
            className="text-sm hover:underline text-accent-chat"
          >
            Clear
          </button>
        </div>
      )}
    </>
  );
}
