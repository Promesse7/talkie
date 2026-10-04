import "./chat.css";
import phone from "./images/phone.png";
import info from "./images/info.png";
import video from "./images/video.png";
import emoji from "./images/happy.png";
import mic from "./images/mic.png";
import camera from "./images/camera.png";
import image from "./images/image.png";
import profile from "./images/placeholder.png";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { useChatStore } from "../../lib/stores/chatStore.js";
import Upload from "../../lib/upload.js";

const Chat = () => {
    const [chat, setChat] = useState(null);
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [img, setImg] = useState({
        file: null,
        url: ""
    });

    const { currentUser, chatId, user, isCurrentUserBlocked, isReceiverBlocked } = useChatStore();
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    useEffect(() => {
        let unSub;
        if (chatId) {
            unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
                const data = res.data();
                if (data && data.messages) {
                    // Sort messages by timestamp
                    data.messages.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
                    setChat(data);
                }
            });
        }

        return () => {
            if (unSub) unSub();
        };
    }, [chatId]);

    const handleEmoji = (emojiData) => {
        setText((prev) => prev + emojiData.emoji);
        setOpen(false);
    };

    const handleImg = async (e) => {
        if (e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setImg({
                file: selectedFile,
                url: URL.createObjectURL(selectedFile)
            });
        }
    };

    const updateUserChats = async (messageText) => {
        const userIds = [currentUser?.id, user?.id];
        const batch = writeBatch(db);

        for (const id of userIds) {
            if (id) {
                const userChatRef = doc(db, "userChats", id);
                const userSnapShot = await getDoc(userChatRef);

                if (userSnapShot.exists()) {
                    const userChatsData = userSnapShot.data();
                    const chatIndex = userChatsData.chats.findIndex(c => c.chatId === chatId);

                    if (chatIndex !== -1) {
                        userChatsData.chats[chatIndex] = {
                            ...userChatsData.chats[chatIndex],
                            lastMessage: messageText || "Image",
                            isSeen: id === currentUser?.id,
                            updateAt: new Date()
                        };

                        batch.update(userChatRef, { chats: userChatsData.chats });
                    }
                }
            }
        }

        await batch.commit();
    };

    const handleSend = async () => {
        if (text.trim() === "" && !img.file) return;

        try {
            const batch = writeBatch(db);
            const messageData = {
                senderId: currentUser?.id || "",
                createdAt: new Date(),
                isSeen: false,
            };

            if (text.trim() !== "") {
                messageData.text = text.trim();
            }

            if (img.file) {
                const imgUrl = await Upload(img.file);
                messageData.img = imgUrl;
            }

            const chatRef = doc(db, "chats", chatId);
            batch.update(chatRef, {
                messages: arrayUnion(messageData)
            });

            await batch.commit();
            await updateUserChats(messageData.text || "Image");

            setText("");
            setImg({ file: null, url: "" });
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    useEffect(() => {
        const markMessagesAsSeen = async () => {
            if (chatId && chat && currentUser) {
                const updatedMessages = chat.messages.map(message => {
                    if (message.senderId !== currentUser.id && !message.isSeen) {
                        return { ...message, isSeen: true };
                    }
                    return message;
                });

                if (JSON.stringify(updatedMessages) !== JSON.stringify(chat.messages)) {
                    await updateDoc(doc(db, "chats", chatId), { messages: updatedMessages });
                }
            }
        };

        markMessagesAsSeen();
    }, [chatId, chat, currentUser]);

    if (!chat) return <div>Loading...</div>;

    return (
        <div className="chat">
            <div className="top">
                <div className="user">
                    <img src={user?.avatar || profile} alt="" />
                    <div className="texts">
                        <span>{user?.username}</span>
                        <p>Love is one step at hand!</p>
                    </div>
                </div>
                <div className="icons">
                    <img src={phone} alt="" />
                    <img src={video} alt="" />
                    <img src={info} alt="" />
                </div>
            </div>
            <div className="center">
                {chat.messages.map((message) => (
                    <div className={`message ${message.senderId === currentUser?.id ? 'own' : ''}`} key={message.createdAt.toMillis()}>
                        <div className="texts">
                            {message.img && <img src={message.img} alt="" />}
                            {message.text && <p>{message.text}</p>}
                            {message.isSeen && <span>Seen</span>}
                        </div>
                    </div>
                ))}
                <div ref={endRef}></div>
            </div>
            <div className="bottom">
                <div className="icons">
                    <label htmlFor="file">
                        <img src={image} alt="" />
                    </label>
                    <input type="file" style={{ display: "none" }} onChange={handleImg} id="file" />
                    <img src={camera} alt="" />
                    <img src={mic} alt="" />
                </div>
                <input 
                    type="text" 
                    placeholder={(isCurrentUserBlocked || isReceiverBlocked) ? "You are not allowed to send messages" : "Type your message here!"} 
                    value={text} 
                    onChange={(e) => setText(e.target.value)}
                    disabled={isCurrentUserBlocked || isReceiverBlocked}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSend();
                        }
                    }}
                />
                <div className="emoji">
                    <img src={emoji} alt="" onClick={() => setOpen((prev) => !prev)} />
                    {open && (
                        <div className="picker">
                            <EmojiPicker onEmojiClick={handleEmoji} />
                        </div>
                    )}
                </div>
                <button className="sendButton" onClick={handleSend} disabled={isCurrentUserBlocked || isReceiverBlocked}>
                    Send
                </button>
            </div>
        </div>
    );
};

export default Chat;