// Socket.io mock for E2E tests
// This creates a mock socket that can be controlled from tests

import { Page } from '@playwright/test';

export interface SocketMockController {
  // Emit events to the client as if coming from the server
  emit: (event: string, data?: unknown) => Promise<void>;
  // Simulate connection events
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  // Check if socket was called with specific event
  getEmittedEvents: () => Promise<{ event: string; data: unknown }[]>;
  // Clear recorded events
  clearEmittedEvents: () => Promise<void>;
  // Simulate specific chat scenarios
  simulateMatch: (partnerId: number, partnerUsername: string, sessionId: number) => Promise<void>;
  simulatePartnerMessage: (message: string, sessionId: number) => Promise<void>;
  simulatePartnerLeft: (sessionId: number) => Promise<void>;
  simulateChatEnded: (sessionId: number) => Promise<void>;
}

// Script to inject into the page to mock Socket.io
const SOCKET_MOCK_SCRIPT = `
(function() {
  // Store for emitted events (client -> server)
  window.__socketEmittedEvents = [];

  // Store for registered event handlers
  window.__socketHandlers = new Map();

  // Mock connected state
  window.__socketConnected = true;

  // Create mock socket object
  const mockSocket = {
    connected: true,
    id: 'mock-socket-id',

    // Register event handlers
    on: function(event, callback) {
      if (!window.__socketHandlers.has(event)) {
        window.__socketHandlers.set(event, []);
      }
      window.__socketHandlers.get(event).push(callback);
      return this;
    },

    // Emit event to server (we record it)
    emit: function(event, ...args) {
      window.__socketEmittedEvents.push({ event, data: args });
      // Some events might need to trigger a callback
      const lastArg = args[args.length - 1];
      if (typeof lastArg === 'function') {
        // Auto-acknowledge for certain events
        setTimeout(() => lastArg({ success: true }), 10);
      }
      return this;
    },

    // Remove event handler
    off: function(event, callback) {
      if (callback && window.__socketHandlers.has(event)) {
        const handlers = window.__socketHandlers.get(event);
        const index = handlers.indexOf(callback);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      } else if (!callback) {
        window.__socketHandlers.delete(event);
      }
      return this;
    },

    // Remove all handlers for an event
    removeAllListeners: function(event) {
      if (event) {
        window.__socketHandlers.delete(event);
      } else {
        window.__socketHandlers.clear();
      }
      return this;
    },

    // Connect (already connected in mock)
    connect: function() {
      window.__socketConnected = true;
      this.connected = true;
      this._triggerEvent('connect');
      return this;
    },

    // Disconnect
    disconnect: function() {
      window.__socketConnected = false;
      this.connected = false;
      this._triggerEvent('disconnect');
      return this;
    },

    // Internal: trigger event handlers
    _triggerEvent: function(event, ...args) {
      const handlers = window.__socketHandlers.get(event) || [];
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (e) {
          console.error('Socket handler error:', e);
        }
      });
    }
  };

  // Function for tests to trigger events from "server"
  window.__triggerSocketEvent = function(event, data) {
    mockSocket._triggerEvent(event, data);
  };

  // Function to get emitted events
  window.__getSocketEmittedEvents = function() {
    return window.__socketEmittedEvents;
  };

  // Function to clear emitted events
  window.__clearSocketEmittedEvents = function() {
    window.__socketEmittedEvents = [];
  };

  // Override socket.io-client's io function if it exists
  if (typeof window.io !== 'undefined') {
    const originalIo = window.io;
    window.io = function(...args) {
      console.log('[Socket Mock] Intercepted io() call with args:', args);
      return mockSocket;
    };
    window.io.connect = function(...args) {
      console.log('[Socket Mock] Intercepted io.connect() call with args:', args);
      return mockSocket;
    };
  }

  // Also provide it as a global
  window.__mockSocket = mockSocket;

  // If there's a manager or other socket.io internals, we mock those too
  window.__socketInitialized = true;

  console.log('[Socket Mock] Socket.io mock installed');
})();
`;

export async function setupSocketMock(page: Page): Promise<SocketMockController> {
  // Inject the mock script before any page scripts run
  await page.addInitScript(SOCKET_MOCK_SCRIPT);

  // Also intercept any socket.io script loads
  await page.route('**/socket.io/**', async (route) => {
    // Return a minimal socket.io that uses our mock
    if (route.request().url().includes('.js')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.io = window.io || function() { return window.__mockSocket; };
          window.io.connect = function() { return window.__mockSocket; };
        `,
      });
    }
    return route.continue();
  });

  const controller: SocketMockController = {
    emit: async (event: string, data?: unknown) => {
      await page.evaluate(
        ({ event, data }) => {
          (window as unknown as { __triggerSocketEvent: (e: string, d: unknown) => void }).__triggerSocketEvent(event, data);
        },
        { event, data }
      );
    },

    connect: async () => {
      await page.evaluate(() => {
        const win = window as unknown as { __mockSocket: { connect: () => void } };
        win.__mockSocket?.connect();
      });
    },

    disconnect: async () => {
      await page.evaluate(() => {
        const win = window as unknown as { __mockSocket: { disconnect: () => void } };
        win.__mockSocket?.disconnect();
      });
    },

    getEmittedEvents: async () => {
      return page.evaluate(() => {
        const win = window as unknown as { __getSocketEmittedEvents: () => { event: string; data: unknown }[] };
        return win.__getSocketEmittedEvents?.() || [];
      });
    },

    clearEmittedEvents: async () => {
      await page.evaluate(() => {
        const win = window as unknown as { __clearSocketEmittedEvents: () => void };
        win.__clearSocketEmittedEvents?.();
      });
    },

    // High-level helpers for common scenarios
    simulateMatch: async (partnerId: number, partnerUsername: string, sessionId: number) => {
      await controller.emit('chat:matched', {
        sessionId,
        partner: { id: partnerId, username: partnerUsername },
      });
    },

    simulatePartnerMessage: async (message: string, sessionId: number) => {
      await controller.emit('chat:message', {
        sessionId,
        message: {
          id: Date.now(),
          content: message,
          sender_id: 999, // Partner ID
          sender_username: 'Partner',
          created_at: new Date().toISOString(),
        },
      });
    },

    simulatePartnerLeft: async (sessionId: number) => {
      await controller.emit('chat:partner_left', {
        sessionId,
      });
    },

    simulateChatEnded: async (sessionId: number) => {
      await controller.emit('chat:ended', {
        sessionId,
      });
    },
  };

  return controller;
}

// Alternative: Create a socket mock that works with the page's existing socket instance
export async function injectSocketController(page: Page): Promise<SocketMockController> {
  // This version tries to hook into an existing socket connection
  // Useful if the app initializes its own socket

  await page.addInitScript(`
    // Wait for socket to be available and wrap it
    const originalAddEventListener = EventTarget.prototype.addEventListener;

    // Store handlers we can trigger
    window.__chatEventHandlers = {};

    // Function to trigger chat events
    window.__triggerChatEvent = function(event, data) {
      const handlers = window.__chatEventHandlers[event] || [];
      handlers.forEach(h => {
        try { h(data); } catch(e) { console.error(e); }
      });
    };

    // Hook to capture socket event registrations
    window.__registerChatHandler = function(event, handler) {
      if (!window.__chatEventHandlers[event]) {
        window.__chatEventHandlers[event] = [];
      }
      window.__chatEventHandlers[event].push(handler);
    };
  `);

  return {
    emit: async (event: string, data?: unknown) => {
      await page.evaluate(
        ({ event, data }) => {
          const win = window as unknown as { __triggerChatEvent: (e: string, d: unknown) => void };
          win.__triggerChatEvent?.(event, data);
        },
        { event, data }
      );
    },

    connect: async () => {
      await page.evaluate(() => {
        const win = window as unknown as { __triggerChatEvent: (e: string, d: unknown) => void };
        win.__triggerChatEvent?.('connect', {});
      });
    },

    disconnect: async () => {
      await page.evaluate(() => {
        const win = window as unknown as { __triggerChatEvent: (e: string, d: unknown) => void };
        win.__triggerChatEvent?.('disconnect', {});
      });
    },

    getEmittedEvents: async () => [],
    clearEmittedEvents: async () => {},

    simulateMatch: async (partnerId: number, partnerUsername: string, sessionId: number) => {
      await page.evaluate(
        ({ partnerId, partnerUsername, sessionId }) => {
          const win = window as unknown as { __triggerChatEvent: (e: string, d: unknown) => void };
          win.__triggerChatEvent?.('chat:matched', {
            sessionId,
            partner: { id: partnerId, username: partnerUsername },
          });
        },
        { partnerId, partnerUsername, sessionId }
      );
    },

    simulatePartnerMessage: async (message: string, sessionId: number) => {
      await page.evaluate(
        ({ message, sessionId }) => {
          const win = window as unknown as { __triggerChatEvent: (e: string, d: unknown) => void };
          win.__triggerChatEvent?.('chat:message', {
            sessionId,
            message: {
              id: Date.now(),
              content: message,
              sender_id: 999,
              sender_username: 'Partner',
              created_at: new Date().toISOString(),
            },
          });
        },
        { message, sessionId }
      );
    },

    simulatePartnerLeft: async (sessionId: number) => {
      await page.evaluate(
        ({ sessionId }) => {
          const win = window as unknown as { __triggerChatEvent: (e: string, d: unknown) => void };
          win.__triggerChatEvent?.('chat:partner_left', { sessionId });
        },
        { sessionId }
      );
    },

    simulateChatEnded: async (sessionId: number) => {
      await page.evaluate(
        ({ sessionId }) => {
          const win = window as unknown as { __triggerChatEvent: (e: string, d: unknown) => void };
          win.__triggerChatEvent?.('chat:ended', { sessionId });
        },
        { sessionId }
      );
    },
  };
}
