import React, { useEffect, useState } from "react";
import "./chatList.css";
import search from "./search.png";
import plus from "./plus.png";
import minus from "./minus.png";
import AddUser from "./addUser/addUser";
import profile from "./images/placeholder.png";
import { useUserStore } from "../../../lib/stores/userStore.js";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase.js";
import { useChatStore } from "../../../lib/stores/chatStore.js";

const ChatList = () => {
    const [chats, setChats] = useState([]);
    const [addMode, setAddMode] = useState(false);
    const [input, setInput] = useState("");

    const { currentUser } = useUserStore();
    const { changeChat } = useChatStore();

    useEffect(() => {
        if (!currentUser || !currentUser.id) return;

        const unSub = onSnapshot(doc(db, "userChats", currentUser.id), async (res) => {
            const data = res.data();
            if (!data || !data.chats) return;

            const items = data.chats;

            const promises = items.map(async (item) => {
                const userDocRef = doc(db, "users", item.receiverId);
                const userDocSnap = await getDoc(userDocRef);
                const user = userDocSnap.data();

                return { ...item, user };
            });

            const chatData = await Promise.all(promises);

            setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
        });

        return () => {
            unSub();
        };
    }, [currentUser]);

    const handleSelect = async (chat) => {
        const chatIndex = chats.findIndex((item) => item.chatId === chat.chatId);

        if (chatIndex !== -1) {
            chats[chatIndex].isSeen = true;
            setChats([...chats]);

            await updateDoc(doc(db, "userChats", currentUser.id), {
                chats: chats.map((item) =>
                    item.chatId === chat.chatId ? { ...item, isSeen: true } : item
                ),
            });

            changeChat(chat.chatId, chat.user);
        }
    };

    const handleAddChat = (newChat) => {
        setChats((prevChats) => [...prevChats, newChat]);
    };

    const filteredChats = chats.filter(chat => 
        chat.user && chat.user.username && 
        chat.user.username.toLowerCase().includes(input.toLowerCase())
    );

    return (
        <div className="chatList">
            <div className="search">
                <div className="searchbar">
                    <img src={search} alt="Search" />
                    <input 
                        type="text" 
                        placeholder="Search" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>
                <img
                    src={addMode ? minus : plus}
                    alt="Toggle Add User"
                    className="add"
                    onClick={() => setAddMode((prev) => !prev)}
                />
            </div>
            {filteredChats.map((chat) => (
                <div
                    className="item"
                    key={chat.chatId}
                    onClick={() => handleSelect(chat)}
                    style={{ background: chat.isSeen ? "transparent" : "#5183fe" }}
                >
                    <img src={chat.user?.avatar || profile} alt="User" />
                    <div className="texts">
                        <span>{chat.user?.username || 'Unknown User'}</span>
                        <p>{chat.lastMessage}</p>
                    </div>
                </div>
            ))}
            {addMode && <AddUser onAddChat={handleAddChat} />}
        </div>
    );
};

export default ChatList;