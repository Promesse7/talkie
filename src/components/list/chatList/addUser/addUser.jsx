import React, { useState } from "react";
import { toast } from "react-toastify";
import "./addUser.css";
import rp from "./rp.png";
import { useUserStore } from "../../../../lib/stores/userStore.js";
import { ensureChat, findUserByUsername } from "../../../../lib/chats.js";
import { languageName } from "../../../../lib/languages.js";

const AddUser = ({ onChatOpened }) => {
    const [user, setUser] = useState(null);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);
    const currentUser = useUserStore((s) => s.currentUser);

    const handleSearch = async (e) => {
        e.preventDefault();
        const username = new FormData(e.target).get("username")?.toString().trim();
        if (!username) return;
        setSearching(true);
        try {
            const found = await findUserByUsername(username);
            if (!found) {
                setUser(null);
                toast.info("No user found with that username.");
            } else if (found.id === currentUser.id) {
                setUser(null);
                toast.info("That is you!");
            } else {
                setUser(found);
            }
        } catch (err) {
            console.error(err);
            toast.error("Search failed. Try again.");
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async () => {
        if (!user) return;
        setAdding(true);
        try {
            const chatId = await ensureChat(currentUser, user);
            onChatOpened(chatId, user);
            setUser(null);
        } catch (err) {
            console.error(err);
            toast.error("Could not start the chat.");
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="addUser">
            <form onSubmit={handleSearch}>
                <input type="text" placeholder="Username" name="username" aria-label="Username" autoComplete="off" />
                <button disabled={searching}>{searching ? "Searching..." : "Search"}</button>
            </form>
            {user && (
                <div className="user">
                    <div className="detail">
                        <img src={user.avatar || rp} alt="" />
                        <div>
                            <span>{user.username}</span>
                            <small>{languageName(user.preferredLanguage)}</small>
                        </div>
                    </div>
                    <button type="button" onClick={handleAdd} disabled={adding}>
                        {adding ? "Opening..." : "Start chat"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AddUser;
