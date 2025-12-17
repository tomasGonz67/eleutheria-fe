import { useChatStore } from '@/store/chatStore';

export default function FloatingChats() {
  const { plannedChats, toggleMinimize, removePlannedChat } = useChatStore();

  if (plannedChats.length === 0) {
    return null; // Don't render anything if no chats
  }

  return (
    <div className="fixed bottom-4 right-4 flex items-end gap-3 z-40">
      {plannedChats.map((chat) => (
        <div
          key={chat.id}
          className="bg-white rounded-lg shadow-xl border-2"
          style={{
            borderColor: '#AA633F',
            width: chat.isMinimized ? '280px' : '320px',
            maxHeight: chat.isMinimized ? '50px' : '450px'
          }}
        >
          {/* Chat Header */}
          <div
            className="p-3 border-b border-gray-200 flex items-center justify-between cursor-pointer"
            style={{ backgroundColor: '#AA633F' }}
            onClick={() => toggleMinimize(chat.id)}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">
                {chat.partnerUsername || chat.inviteCode}
              </span>
              {chat.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {chat.unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimize(chat.id);
                }}
                className="text-white hover:text-gray-200 text-xl"
              >
                {chat.isMinimized ? '▲' : '▼'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePlannedChat(chat.id);
                }}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Body - Only show when not minimized */}
          {!chat.isMinimized && (
            <div className="p-4">
              <div className="text-center text-gray-500 text-sm">
                <p>Chat with {chat.partnerUsername || 'partner'}</p>
                <p className="text-xs mt-2">Invite Code: {chat.inviteCode}</p>
                <p className="text-xs text-gray-400 mt-4">
                  Real-time messaging coming soon...
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
