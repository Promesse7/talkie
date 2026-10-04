import "./detail.css"
import arrowUp from "./up.png";
import arrowDown from "./down.png";
import download from "./download.png";
import { useUserStore } from "../../lib/stores/userStore.js";
import profile from "./images/placeholder.png";
import { auth, db } from "../../lib/firebase.js";
import { useChatStore } from "../../lib/stores/chatStore.js"
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";



const Detail = () => {
  const handleLogout = () => {
    auth.signOut();
  };
    const {chatId, user, isCurrentUserBlocked, isReceiverBlocked, changeBlock} = useChatStore();
       const { currentUser } = useUserStore();
    const handleBlock = async () => {
       if(!user) return;

       const userDocRef = doc(db, "users", currentUser.id);
       try{
       await updateDoc(userDocRef, {
        blocked: isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id),
       });
       changeBlock()
     } catch(err){
        console.log(err)
       }
    };
    
    return (
        <div className="detail">
            <div className="user">
                <img src={user.avatar || profile} alt="" />
                <h2>{user?.username}</h2>
                <p>Love is one step at hand!</p>
            </div>
            <div className="info">
                <div className="option">
                    <div className="tittle">
                        <span>Chat settings</span>
                        <img src={arrowUp} alt="" />
                    </div>
                </div>
                <div className="option">
                    <div className="tittle">
                        <span>Privacy & Help</span>
                        <img src={arrowUp} alt="" />
                    </div>
                </div>
                <div className="option">
                    <div className="tittle">
                        <span>Shared Photos</span>
                        <img src={arrowDown} alt="" />
                    </div>
                    <div className="photos">
                        <div className="photoItem">
                            <div className="photoDetail">
                                <img src={profile} alt="" />
                            <span>photo_2024.png</span>
                            </div>
                        <img src={download} alt="" className="icon"/>
                        </div>
                        <div className="photoItem">
                            <div className="photoDetail">
                                <img src={profile} alt="" />
                            <span>photo_2024.png</span>
                            </div>
                        <img src={download} alt="" className="icon"/>
                        </div>
                        <div className="photoItem">
                            <div className="photoDetail">
                                <img src={profile} alt="" />
                            <span>photo_2024.png</span>
                            </div>
                        <img src={download} alt="" className="icon" />
                        </div>
                        <div className="photoItem">
                            <div className="photoDetail">
                                <img src={profile} alt="" />
                            <span>photo_2024.png</span>
                            </div>
                        <img src={download} alt="" className="icon"/>
                        </div>
                    </div>
                </div>
                <div className="option">
                    <div className="tittle">
                        <span>Shared Files</span>
                        <img src={arrowUp} alt="" />
                    </div>
                </div>
                <button className="block"  onClick={handleBlock}>{
                    
                    isCurrentUserBlocked ? "You are blocked" : isReceiverBlocked ? "User Blocked" : "Block User"
                    }</button>
                <button className="logout"  onClick={handleLogout}>Log Out</button>
            </div>
           
        </div>
    )
}

export default Detail 