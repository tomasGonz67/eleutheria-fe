import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';

export default function PlannedChat() {
  const [inviteTarget, setInviteTarget] = useState('');
  const { addPlannedChat } = useChatStore();

  // Mock data - will be replaced with real data later
  const receivedInvites = [
    {
      id: 1,
      from_username: 'WiseAthena',
      created_at: '2025-01-15T10:30:00Z',
    },
    {
      id: 2,
      from_username: 'BravePegasus',
      created_at: '2025-01-15T09:15:00Z',
    },
  ];

  const sentInvites = [
    {
      id: 3,
      to_username: 'SwiftHermes',
      created_at: '2025-01-15T11:00:00Z',
    },
  ];

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call matchPlanned API
    console.log('Send invite to:', inviteTarget);
    setInviteTarget('');
  };

  const handleAccept = (inviteId: number) => {
    // TODO: Call acceptChatRequest API
    console.log('Accept invite:', inviteId);

    // TEST: Add to floating chat widget
    // Use inviteId directly to ensure unique IDs
    addPlannedChat({
      id: inviteId,
      inviteCode: `TEST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      partnerUsername: 'TestPartner',
      isMinimized: false,
      unreadCount: 0,
    });
  };

  const handleReject = (inviteId: number) => {
    // TODO: Call rejectChatRequest API
    console.log('Reject invite:', inviteId);
  };

  const handleCancel = (inviteId: number) => {
    // TODO: Call cancelChatRequest API
    console.log('Cancel invite:', inviteId);
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-xl font-semibold mb-4">Planned Chat</h3>

      {/* Send Invite Form */}
      <form onSubmit={handleSendInvite} className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Invite Someone to Chat
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={inviteTarget}
            onChange={(e) => setInviteTarget(e.target.value)}
            placeholder="Enter username or session token"
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-olive-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inviteTarget.trim()}
            className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send Invite
          </button>
        </div>
      </form>

      {/* Received Invites */}
      {receivedInvites.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Received Invites</h4>
          <div className="space-y-2">
            {receivedInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-olive-200 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-800">{invite.from_username}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    wants to chat
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(invite.id)}
                    className="px-4 py-1 bg-olive-600 text-white rounded hover:bg-olive-700 transition text-sm font-semibold"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(invite.id)}
                    className="px-4 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm font-semibold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Invites */}
      {sentInvites.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Sent Invites</h4>
          <div className="space-y-2">
            {sentInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-marble-100 border border-gray-200 rounded-lg"
              >
                <div>
                  <span className="text-sm text-gray-500">Waiting for</span>
                  <span className="font-medium text-gray-800 ml-1">{invite.to_username}</span>
                  <span className="text-sm text-gray-500 ml-1">to respond</span>
                </div>
                <button
                  onClick={() => handleCancel(invite.id)}
                  className="px-4 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {receivedInvites.length === 0 && sentInvites.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-4">
          No pending invites. Send one to start a planned chat!
        </p>
      )}
    </div>
  );
}
