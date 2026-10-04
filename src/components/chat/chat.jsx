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
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import MessageBubble from "./MessageBubble.jsx";
import { useChatStore } from "../../lib/stores/chatStore.js";
import { useUserStore } from "../../lib/stores/userStore.js";
import { absorbDroppedMessages, blockFlags, dedupeById } from "../../lib/chat.js";
import { languageName } from "../../lib/languages.js";
import {
    fetchOlderMessages,
    markMessagesSeen,
    sendMessage,
    subscribeToMessages,
} from "../../lib/messages.js";

const PAGE_SIZE = 50;

const Chat = () => {
    // `live` is the newest PAGE_SIZE messages (real-time). `older` holds everything the
    // user paged back to, plus messages that slid out of the live window as new ones arrived.
    const [live, setLive] = useState(null);
    const [older, setOlder] = useState([]);
    const [reachedEnd, setReachedEnd] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [img, setImg] = useState({ file: null, url: "" });

    const chatId = useChatStore((s) => s.chatId);
    const receiver = useChatStore((s) => s.receiver);
    const currentUser = useUserStore((s) => s.currentUser);
    const endRef = useRef(null);
    const lastIdRef = useRef(null);
    const liveRef = useRef(null);

    const { isCurrentUserBlocked, isReceiverBlocked } = blockFlags(currentUser, receiver);
    const blocked = isCurrentUserBlocked || isReceiverBlocked;

    useEffect(() => {
        if (!chatId) return undefined;
        setLive(null);
        setOlder([]);
        setReachedEnd(false);
        lastIdRef.current = null;
        liveRef.current = null;
        return subscribeToMessages(
            chatId,
            PAGE_SIZE,
            (messages) => {
                setOlder((prev) => absorbDroppedMessages(liveRef.current, messages, prev));
                liveRef.current = messages;
                setLive(messages);
            },
            (err) => {
                console.error(err);
                toast.error("Could not load messages.");
            }
        );
    }, [chatId]);

    useEffect(() => {
        if (!live || !chatId || !currentUser) return;
        markMessagesSeen(chatId, live, currentUser.id).catch(console.error);
        const newestId = live[live.length - 1]?.id ?? null;
        if (newestId !== lastIdRef.current) {
            lastIdRef.current = newestId;
            endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [live, chatId, currentUser]);

    const messages = useMemo(() => dedupeById([...older, ...(live ?? [])]), [older, live]);
    // A full live page means there may be more history; a short one is the whole chat.
    const hasMore = !reachedEnd && (live?.length ?? 0) >= PAGE_SIZE;

    const handleLoadOlder = async () => {
        const oldest = messages[0];
        if (!oldest?.createdAt || loadingOlder) return;
        setLoadingOlder(true);
        try {
            const page = await fetchOlderMessages(chatId, oldest.createdAt, PAGE_SIZE);
            setOlder((prev) => dedupeById([...page, ...prev]));
            if (page.length < PAGE_SIZE) setReachedEnd(true);
        } catch (err) {
            console.error(err);
            toast.error("Could not load earlier messages.");
        } finally {
            setLoadingOlder(false);
        }
    };

    const handleEmoji = (emojiData) => {
        setText((prev) => prev + emojiData.emoji);
        setOpen(false);
    };

    const handleImg = (e) => {
        const file = e.target.files?.[0];
        if (file) setImg({ file, url: URL.createObjectURL(file) });
    };

    const handleSend = async () => {
        if (blocked || sending) return;
        if (text.trim() === "" && !img.file) return;
        setSending(true);
        try {
            await sendMessage({ chatId, sender: currentUser, receiver, text, file: img.file });
            setText("");
            setImg({ file: null, url: "" });
        } catch (err) {
            console.error("Error sending message:", err);
            toast.error("Message not sent. Please try again.");
        } finally {
            setSending(false);
        }
    };

    if (!live) return <div className="chat"><div className="center"><p>Loading...</p></div></div>;

    return (
        <div className="chat">
            <div className="top">
                <div className="user">
                    <img src={receiver?.avatar || profile} alt="" />
                    <div className="texts">
                        <span>{receiver?.username ?? "Unknown user"}</span>
                        <p>Reads in {languageName(receiver?.preferredLanguage)}</p>
                    </div>
                </div>
                <div className="icons">
                    <img src={phone} alt="" />
                    <img src={video} alt="" />
                    <img src={info} alt="" />
                </div>
            </div>
            <div className="center">
                {hasMore && (
                    <button type="button" className="loadMore" onClick={handleLoadOlder} disabled={loadingOlder}>
                        {loadingOlder ? "Loading..." : "Load earlier messages"}
                    </button>
                )}
                {messages.map((m) => (
                    <MessageBubble
                        key={m.id}
                        message={m}
                        viewerId={currentUser.id}
                        viewerLang={currentUser.preferredLanguage}
                        chatId={chatId}
                    />
                ))}
                {img.url && (
                    <div className="message own pendingImage">
                        <div className="texts">
                            <img src={img.url} alt="Selected image preview" />
                            <span>Ready to send</span>
                        </div>
                    </div>
                )}
                <div ref={endRef}></div>
            </div>
            <div className="bottom">
                <div className="icons">
                    <label htmlFor="file">
                        <img src={image} alt="Attach image" />
                    </label>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImg} id="file" />
                    <img src={camera} alt="" />
                    <img src={mic} alt="" />
                </div>
                <input
                    type="text"
                    placeholder={blocked ? "You are not allowed to send messages" : "Type your message here!"}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={blocked}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <div className="emoji">
                    <img src={emoji} alt="Emoji" onClick={() => setOpen((prev) => !prev)} />
                    {open && (
                        <div className="picker">
                            <EmojiPicker onEmojiClick={handleEmoji} />
                        </div>
                    )}
                </div>
                <button className="sendButton" onClick={handleSend} disabled={blocked || sending}>
                    {sending ? "..." : "Send"}
                </button>
            </div>
        </div>
    );
};

export default Chat;
