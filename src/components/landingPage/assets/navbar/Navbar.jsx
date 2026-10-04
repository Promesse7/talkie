import React from "react";
import logo from "./logo.png";

const Navbar = ({ onLogin, onRegister }) => {
  return (
    <nav className="h-[60px] w-[90vw] bg-white flex items-center justify-between py-[50px] px-[50px] md:px-10 sm:px-8 xs:px-4 rounded-t-lg ">
      <div className="flex items-center justify-between w-full h-full pr-[3vw] md:pr-2 sm:pr-1">
        <span className="flex items-center justify-center">
          <img
            src={logo}
            alt="Talkie logo"
            className="ml-[1.3vw] md:ml-2 sm:ml-1 w-[130px] h-[100px] md:w-[80px] md:h-[60px] sm:w-[50px] sm:h-[40px] object-contain filter drop-shadow-lg"
          />
        </span>
        <div className="flex justify-between">
          <button
            type="button"
            className="flex items-center justify-center text-xl md:text-lg sm:text-base xs:text-sm font-medium text-white bg-[rgb(171,59,45)] rounded-lg py-2 px-5 md:py-2 md:px-4 sm:py-1 sm:px-2 shadow-md border-none cursor-pointer ml-2 mr-2 hover:bg-[rgb(151,42,27)]"
            onClick={onRegister}
          >
            Register
          </button>
          <button
            type="button"
            className="flex items-center justify-center text-xl md:text-lg sm:text-base xs:text-sm font-medium text-[rgb(171,59,45)] rounded-lg py-2 px-5 md:py-2 md:px-4 sm:py-1 sm:px-2 shadow-md border-none cursor-pointer ml-2 mr-2 hover:bg-[rgb(171,59,45)] hover:text-white"
            onClick={onLogin}
          >
            Login
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
