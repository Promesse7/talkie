import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "./chatList.css";
import search from "./search.png";
import plus from "./plus.png";
import minus from "./minus.png";
import AddUser from "./addUser/addUser";
import profile from "./images/placeholder.png";
import { useUserStore } from "../../../lib/stores/userStore.js";
import { useChatStore } from "../../../lib/stores/chatStore.js";
import { subscribeToChats, markChatSeen } from "../../../lib/chats.js";

const ChatList = () => {
    const [chats, setChats] = useState([]);
    const [addMode, setAddMode] = useState(false);
    const [input, setInput] = useState("");

    const currentUser = useUserStore((s) => s.currentUser);
    const openChat = useChatStore((s) => s.openChat);
    const activeChatId = useChatStore((s) => s.chatId);

    useEffect(() => {
        if (!currentUser?.id) return undefined;
        return subscribeToChats(currentUser.id, setChats, (err) => {
            console.error(err);
            toast.error("Could not load your chats.");
        });
    }, [currentUser?.id]);

    const handleSelect = (chat) => {
        if (!chat.user) return;
        openChat(chat.id, chat.user);
        markChatSeen(chat.id, currentUser.id).catch(console.error);
    };

    const handleChatOpened = (chatId, user) => {
        openChat(chatId, user);
        setAddMode(false);
    };

    const filteredChats = chats.filter((chat) =>
        (chat.user?.username ?? "").toLowerCase().includes(input.toLowerCase())
    );

    return (
        <div className="chatList">
            <div className="search">
                <div className="searchbar">
                    <img src={search} alt="" />
                    <input
                        type="text"
                        placeholder="Search"
                        aria-label="Search chats"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>
                <img
                    src={addMode ? minus : plus}
                    alt={addMode ? "Close add user" : "Add user"}
                    role="button"
                    className="add"
                    onClick={() => setAddMode((prev) => !prev)}
                />
            </div>
            {filteredChats.length === 0 && !addMode && (
                <p className="emptyState">
                    {chats.length === 0 ? "No chats yet. Tap + to find someone." : "No chats match your search."}
                </p>
            )}
            {filteredChats.map((chat) => {
                const unread = !(chat.seenBy ?? []).includes(currentUser.id);
                const active = chat.id === activeChatId;
                return (
                    <div
                        className={`item${active ? " active" : ""}`}
                        key={chat.id}
                        onClick={() => handleSelect(chat)}
                        style={{ background: unread ? "#5183fe" : "transparent" }}
                    >
                        <img src={chat.user?.avatar || profile} alt="" />
                        <div className="texts">
                            <span>{chat.user?.username || "Unknown user"}</span>
                            <p>{chat.lastMessage?.text ?? "Say hello"}</p>
                        </div>
                    </div>
                );
            })}
            {addMode && <AddUser onChatOpened={handleChatOpened} />}
        </div>
    );
};

export default ChatList;
