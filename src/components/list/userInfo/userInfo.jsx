import React from "react";
import "./userInfo.css";
import video from './images/video.png';
import edit from './images/edit.png';
import more from './images/more.png';
import prom from "./images/rp2.jpg"
import { useUserStore } from "../../../lib/stores/userStore.js"






const UserInfo = () => {

  const { currentUser } = useUserStore();


    return (
        <div className="userInfo">
            <div className="user">
                <img src={currentUser.avatar || prom} alt="" />
                <h4>{currentUser.username}</h4>
            </div>

         <div className="icon">
           <img src={more} alt="more" />
           <img src={video} alt="vid" />
           <img src={edit} alt="ed" />
         </div>
        </div>
    )
}

export default UserInfo