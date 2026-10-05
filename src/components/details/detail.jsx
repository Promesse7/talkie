import "./detail.css";
import arrowUp from "./up.png";
import arrowDown from "./down.png";
import download from "./download.png";
import profile from "./images/placeholder.png";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../../lib/firebase.js";
import { useUserStore } from "../../lib/stores/userStore.js";
import { useChatStore } from "../../lib/stores/chatStore.js";
import { blockFlags, languageSummary } from "../../lib/chat.js";

const Detail = () => {
    const receiver = useChatStore((s) => s.receiver);
    const currentUser = useUserStore((s) => s.currentUser);
    const signOut = useUserStore((s) => s.signOut);
    const { isCurrentUserBlocked, isReceiverBlocked } = blockFlags(currentUser, receiver);

    const handleBlock = async () => {
        if (!receiver || !currentUser) return;
        try {
            // The live profile subscription in useUserStore updates the flag.
            await updateDoc(doc(db, "users", currentUser.id), {
                blocked: isReceiverBlocked ? arrayRemove(receiver.id) : arrayUnion(receiver.id),
            });
        } catch (err) {
            console.error(err);
            toast.error("Could not update block status.");
        }
    };

    const handleLogout = () => {
        signOut().catch((err) => {
            console.error(err);
            toast.error("Could not sign out.");
        });
    };

    return (
        <div className="detail">
            <div className="user">
                <img src={receiver?.avatar || profile} alt="" />
                <h2>{receiver?.username ?? "Unknown user"}</h2>
                <p>{languageSummary(currentUser, receiver)}</p>
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
                        <p className="photosHint">Photos you share in this chat will appear here.</p>
                        <img src={download} alt="" className="icon" style={{ display: "none" }} />
                    </div>
                </div>
                <div className="option">
                    <div className="tittle">
                        <span>Shared Files</span>
                        <img src={arrowUp} alt="" />
                    </div>
                </div>
                <button className="block" onClick={handleBlock} disabled={isCurrentUserBlocked}>
                    {isCurrentUserBlocked ? "You are blocked" : isReceiverBlocked ? "Unblock user" : "Block user"}
                </button>
                <button className="logout" onClick={handleLogout}>Log out</button>
            </div>
        </div>
    );
};

export default Detail;
