import { FormEvent, useRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  disabledMessage?: string;
  autoScroll?: boolean;
  onAutoScrollChange?: (enabled: boolean) => void;
  showAutoScroll?: boolean;
  accentColor?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Type a message...',
  disabledMessage,
  autoScroll = true,
  onAutoScrollChange,
  showAutoScroll = true,
  accentColor = '#4D89B0',
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (disabled && disabledMessage) {
    return (
      <div className="p-4 border-t border-border-strong">
        <div className="text-center text-text-muted text-sm italic py-2">
          {disabledMessage}
        </div>
      </div>
    );
  }

  const isForumAccent = accentColor === '#4D89B0';

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-border-strong">
      {showAutoScroll && onAutoScrollChange && (
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-sm text-text-tertiary cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => onAutoScrollChange(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span>Auto-scroll to new messages</span>
          </label>
        </div>
      )}
      <div className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={1000}
          className={`flex-1 px-4 py-2.5 border-2 border-border text-text-inverted rounded-lg focus:outline-none ${
            isForumAccent ? 'focus:border-accent-forum' : 'focus:border-accent-chat'
          } disabled:bg-surface-tertiary disabled:cursor-not-allowed`}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className={`px-6 py-2.5 text-text-on-color rounded-lg transition font-semibold disabled:bg-disabled-bg disabled:cursor-not-allowed ${
            isForumAccent
              ? 'bg-accent-forum hover:bg-accent-forum/80'
              : 'bg-accent-chat hover:bg-accent-chat/80'
          }`}
        >
          Send
        </button>
      </div>
    </form>
  );
}
