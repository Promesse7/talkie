import React from 'react';
import Navbar from './assets/navbar/Navbar';
import MainView from './assets/MainView/MainView';

const LandingPage = ({ onGetStarted, onLogin, onRegister }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white m-0 p-0 overflow-hidden">
      <Navbar onLogin={onLogin} onRegister={onRegister} />
      <MainView onGetStarted={onGetStarted} />
    </div>
  );
};

export default LandingPage;
