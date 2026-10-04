import { create } from 'zustand';
import { subscribeToUser } from '../chats.js';

export const useChatStore = create((set, get) => ({
  chatId: null,
  receiver: null,
  _unsubReceiver: null,

  /** Open a chat and keep the other participant's profile live (blocked list, language, avatar). */
  openChat(chatId, receiver) {
    get()._unsubReceiver?.();
    const unsub = subscribeToUser(receiver.id, (profile) => set({ receiver: profile ?? receiver }));
    set({ chatId, receiver, _unsubReceiver: unsub });
  },

  closeChat() {
    get()._unsubReceiver?.();
    set({ chatId: null, receiver: null, _unsubReceiver: null });
  },
}));
