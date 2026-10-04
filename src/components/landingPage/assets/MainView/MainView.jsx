import React from 'react';
import logo from './logo.png';

const FEATURES = [
  { title: 'Real-time', text: 'Messages arrive instantly, with read receipts.' },
  {
    title: 'Speaks your language',
    text: 'Pick the language you read in. Talkie translates every message for you, no clicks needed.',
  },
  { title: 'Share moments', text: 'Send photos straight from your device.' },
];

const MainView = ({ onGetStarted }) => {
  return (
    <div className="h-[90vh] overflow-hidden w-full max-h-screen flex items-center justify-center bg-gradient-to-br py-2 px-4 sm:px-2 md:px-16 lg:px-32 box-border">
      <div className="flex flex-col lg:flex-row items-center justify-between h-[90vh] w-full max-w-7xl ">
        {/* Left Section: Text and Button */}
        <div className="flex flex-col w-full lg:w-1/2 space-y-2 text-center lg:text-left">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[rgb(171,59,45)] leading-tight">
            Start Chatting Anywhere, Anytime with Talkie!
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[rgb(151,42,27)] font-light">
            A seamless chatting app that connects you from any place, at any time, without interruptions.
          </p>
          <button
            onClick={onGetStarted}
            className="mt-4 py-3 px-6 bg-[rgb(171,59,45)] text-white rounded-lg shadow-md hover:bg-[rgb(151,42,27)] transition-colors duration-300 text-lg font-semibold w-48 mx-auto lg:mx-0"
          >
            Get Started
          </button>
        </div>

        {/* Right Section: Logo and Features */}
        <div className="flex flex-col items-center w-full lg:w-1/2 py-4">
          <img
            src={logo}
            alt="Talkie Logo"
            className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300 mb-8"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} title={feature.title} text={feature.text} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ title, text }) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
      <h3 className="text-base font-semibold text-[rgb(171,59,45)]">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{text}</p>
    </div>
  );
};

export default MainView;
