import { create } from 'zustand';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { subscribeToUser } from '../chats.js';

/**
 * status:
 *  - 'loading'        auth state or profile not known yet
 *  - 'signedOut'      no Firebase auth user
 *  - 'ready'          auth user and Firestore profile both present
 *  - 'profileMissing' auth user exists but users/{uid} does not
 */
export const useUserStore = create((set, get) => ({
  status: 'loading',
  authUser: null,
  currentUser: null,
  registering: false,
  _unsubProfile: null,

  init() {
    return onAuthStateChanged(auth, (user) => {
      get()._unsubProfile?.();

      if (!user) {
        set({ status: 'signedOut', authUser: null, currentUser: null, _unsubProfile: null });
        return;
      }

      set({ authUser: { id: user.uid, email: user.email }, status: 'loading' });

      const unsub = subscribeToUser(
        user.uid,
        (profile) => {
          if (profile) set({ currentUser: profile, status: 'ready' });
          else if (!get().registering) set({ currentUser: null, status: 'profileMissing' });
        },
        (err) => {
          console.error('Profile subscription failed', err);
          set({ currentUser: null, status: 'profileMissing' });
        }
      );
      set({ _unsubProfile: unsub });
    });
  },

  /** Registration creates the auth user before the profile doc; suppress 'profileMissing' meanwhile. */
  setRegistering(value) {
    set({ registering: value });
  },

  async updatePreferredLanguage(preferredLanguage) {
    const me = get().currentUser;
    if (!me) throw new Error('Not signed in');
    await updateDoc(doc(db, 'users', me.id), { preferredLanguage });
  },

  signOut() {
    return firebaseSignOut(auth);
  },
}));
