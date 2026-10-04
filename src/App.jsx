import { useEffect, useState } from 'react';
import List from './components/list/list.jsx';
import Chat from './components/chat/chat.jsx';
import Detail from './components/details/detail.jsx';
import Login from './components/login/Login.jsx';
import Register from './components/Register/Register.jsx';
import LandingPage from './components/landingPage/LandingPage.jsx';
import Notification from './components/notification/Notification.jsx';
import { useUserStore } from './lib/stores/userStore.js';
import { useChatStore } from './lib/stores/chatStore.js';

function Spinner() {
  return (
    <svg className="pl" width="240" height="240" viewBox="0 0 240 240" role="status" aria-label="Loading">
      <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round" />
      <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round" />
      <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round" />
      <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round" />
    </svg>
  );
}

function ProfileMissing({ onSignOut }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full p-8 text-center text-[rgb(171,59,45)]">
      <h2 className="text-2xl font-semibold">We could not find your profile</h2>
      <p className="text-gray-700 max-w-md">
        Your account exists but its Talkie profile is missing. Sign out and register again, or
        contact support.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        className="py-2 px-6 bg-[rgb(171,59,45)] text-white rounded-lg hover:bg-[rgb(151,42,27)]"
      >
        Sign out
      </button>
    </div>
  );
}

export default function App() {
  const status = useUserStore((s) => s.status);
  const init = useUserStore((s) => s.init);
  const signOut = useUserStore((s) => s.signOut);
  const chatId = useChatStore((s) => s.chatId);
  const closeChat = useChatStore((s) => s.closeChat);
  const [view, setView] = useState('landing');

  useEffect(() => init(), [init]);

  useEffect(() => {
    if (status === 'signedOut') {
      closeChat();
      setView('landing');
    }
  }, [status, closeChat]);

  if (status === 'loading') {
    return (
      <>
        <Spinner />
        <Notification />
      </>
    );
  }

  let content;
  if (status === 'profileMissing') {
    content = <ProfileMissing onSignOut={signOut} />;
  } else if (status === 'signedOut') {
    if (view === 'login') content = <Login onSwitchToRegister={() => setView('register')} />;
    else if (view === 'register') content = <Register onSwitchToLogin={() => setView('login')} />;
    else {
      content = (
        <LandingPage
          onGetStarted={() => setView('register')}
          onLogin={() => setView('login')}
          onRegister={() => setView('register')}
        />
      );
    }
  } else {
    content = (
      <>
        <List />
        {chatId && <Chat />}
        {chatId && <Detail />}
      </>
    );
  }

  return (
    <div className={`container${status === 'ready' ? ' main' : ''}`}>
      {content}
      <Notification />
    </div>
  );
}
