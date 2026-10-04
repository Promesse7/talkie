import { create } from 'zustand';
import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

export const useChatStore = create((set, get) => ({
    chatId: null,
    user: null,
    currentUser: null,
    isCurrentUserBlocked: false,
    isReceiverBlocked: false,

    initializeAuth: () => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                set({ currentUser: { id: user.uid, email: user.email } });
            } else {
                set({ currentUser: null });
            }
        });
        return unsubscribe;
    },

    setCurrentUser: (user) => {
        console.log("Setting current user:", user);
        set({ currentUser: user });
    },

    changeChat: (chatId, user) => {
        const { currentUser } = get();
        console.log("changeChat called. Current user:", currentUser, "Chat user:", user);

        if (!currentUser || !user) {
            console.error("Current user or chat user is not defined");
            return;
        }

        console.log("Updating chat state");
        set({
            chatId,
            user,
            isCurrentUserBlocked: false,
            isReceiverBlocked: false,
        });
    },

    changeBlock: () => {
        set((state) => ({ ...state, isReceiverBlocked: !state.isReceiverBlocked }));
    },
}));