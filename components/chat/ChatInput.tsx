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
      <div className="p-4 border-t border-black">
        <div className="text-center text-gray-500 text-sm italic py-2">
          {disabledMessage}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-black">
      {showAutoScroll && onAutoScrollChange && (
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
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
          className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-black rounded-lg focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{ borderColor: disabled ? '#d1d5db' : undefined }}
          onFocus={(e) => !disabled && (e.target.style.borderColor = accentColor)}
          onBlur={(e) => !disabled && (e.target.style.borderColor = '#d1d5db')}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="px-6 py-2.5 text-white rounded-lg transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          style={{ backgroundColor: disabled || !value.trim() ? '#d1d5db' : accentColor }}
          onMouseEnter={(e) => {
            if (!disabled && value.trim()) {
              const darkerColor = accentColor === '#4D89B0' ? '#3d6e8f' : accentColor;
              e.currentTarget.style.backgroundColor = darkerColor;
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && value.trim()) {
              e.currentTarget.style.backgroundColor = accentColor;
            }
          }}
        >
          Send
        </button>
      </div>
    </form>
  );
}
