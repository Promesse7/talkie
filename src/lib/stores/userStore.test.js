import { describe, it, expect, vi, beforeEach } from 'vitest';

let authCallback;
let profileCallback;

vi.mock('../firebase.js', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, cb) => {
    authCallback = cb;
    return () => {};
  }),
  signOut: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn() }));
vi.mock('../chats.js', () => ({
  subscribeToUser: vi.fn((_uid, cb) => {
    profileCallback = cb;
    return () => {};
  }),
}));

import { useUserStore } from './userStore.js';

beforeEach(() => {
  useUserStore.setState({
    status: 'loading',
    authUser: null,
    currentUser: null,
    registering: false,
    _unsubProfile: null,
  });
  useUserStore.getState().init();
});

describe('useUserStore registration flow', () => {
  it('stays loading while registering, then becomes ready when the profile arrives', () => {
    useUserStore.getState().setRegistering(true);
    authCallback({ uid: 'u1', email: 'a@b.c' });
    profileCallback(null);
    expect(useUserStore.getState().status).toBe('loading');
    profileCallback({ id: 'u1', username: 'ann' });
    useUserStore.getState().setRegistering(false);
    expect(useUserStore.getState().status).toBe('ready');
  });

  it('ends in profileMissing when the profile write fails after the auth user was created', () => {
    useUserStore.getState().setRegistering(true);
    authCallback({ uid: 'u1', email: 'a@b.c' });
    profileCallback(null);
    useUserStore.getState().setRegistering(false);
    expect(useUserStore.getState().status).toBe('profileMissing');
  });
});
