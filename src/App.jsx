import List from './components/list/list';
import Chat from './components/chat/chat';
import Detail from './components/details/detail';
import Login from './components/login/Login';
import Register from './components/Register/Register';
import LandingPage from './components/landingPage/LandingPage';
import Notification from './components/notification/Notification';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase.js';
import { useUserStore } from './lib/stores/userStore.js';
import { useChatStore } from './lib/stores/chatStore.js';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('landing');
  const { currentUser, fetchUserInfo } = useUserStore();
  const { chatId, initializeAuth } = useChatStore();

  useEffect(() => {
    console.log('App useEffect running');
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed', user);
      if (user) {
        console.log('User found, fetching user info');
        try {
          await fetchUserInfo(user.uid);
          console.log('User info fetched', currentUser);
          setCurrentView('main');
        } catch (error) {
          console.error('Error fetching user info:', error);
        }
      } else {
        console.log('No user, setting view to landing');
        setCurrentView('landing');
      }
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    });
   

    console.log('Initializing auth');
    initializeAuth();

    return () => {
      console.log('Cleaning up auth listener');
      unsubscribeAuth();
    };
  }, [fetchUserInfo, initializeAuth]);

  useEffect(() => {
    console.log('Current user updated:', currentUser);
  }, [currentUser]);

  useEffect(() => {
    console.log('Chat ID updated:', chatId);
  }, [chatId]);

  if (isLoading) {
    console.log('Rendering loading state');
    return (
      <svg className="pl" width="240" height="240" viewBox="0 0 240 240">
        <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
      </svg>
    );
  };

  console.log('Rendering content, currentView:', currentView);

  const renderContent = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage onGetStarted={() => setCurrentView('login')} />;
      case 'login':
        return <Login onLoginSuccess={() => setCurrentView('main')} onSwitchToRegister={() => setCurrentView('register')} />;
      case 'register':
        return <Register onRegisterSuccess={() => setCurrentView('main')} onSwitchToLogin={() => setCurrentView('login')} />;
      case 'main':
        return (
          <>
            <List />
            {chatId && <Chat />}
            {chatId && <Detail />}
          </>
        );
      default:
        return <div>Error: Unknown view</div>;
    }
  };

  return (
    <div className="container">
      {renderContent()}
      <Notification />
    </div>
  );
}

export default App;