import React, { useState } from "react";
import "./userInfo.css";
import video from './images/video.png';
import edit from './images/edit.png';
import more from './images/more.png';
import placeholder from "./images/rp2.jpg";
import { useUserStore } from "../../../lib/stores/userStore.js";
import LanguageSettings from "./LanguageSettings.jsx";

const UserInfo = () => {
  const currentUser = useUserStore((s) => s.currentUser);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="userInfoWrap">
      <div className="userInfo">
        <div className="user">
          <img src={currentUser?.avatar || placeholder} alt="" />
          <h4>{currentUser?.username ?? 'Talkie user'}</h4>
        </div>

        <div className="icon">
          <img src={more} alt="more" />
          <img src={video} alt="vid" />
          <img
            src={edit}
            alt="Settings"
            role="button"
            onClick={() => setSettingsOpen((v) => !v)}
          />
        </div>
      </div>

      {settingsOpen && <LanguageSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};

export default UserInfo;
