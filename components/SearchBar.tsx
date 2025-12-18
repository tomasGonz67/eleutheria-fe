import { useState, FormEvent } from 'react';

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  color?: string;
}

export default function SearchBar({
  initialQuery = '',
  onSearch,
  onClear,
  placeholder = 'Search...',
  color = '#AA633F',
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
              className="w-full px-4 py-2 pr-10 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-2 text-white rounded-lg transition font-semibold"
            style={{ backgroundColor: color }}
            onMouseEnter={(e) => {
              const darkerColor = color === '#AA633F' ? '#8a4f32' : color;
              e.currentTarget.style.backgroundColor = darkerColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = color;
            }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Search Indicator */}
      {initialQuery && (
        <div className="mb-4 flex items-center gap-2 text-gray-600">
          <span>Searching for: <strong>{initialQuery}</strong></span>
          <button
            onClick={handleClear}
            className="text-sm hover:underline"
            style={{ color }}
          >
            Clear
          </button>
        </div>
      )}
    </>
  );
}

