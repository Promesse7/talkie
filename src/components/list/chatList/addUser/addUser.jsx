import "./addUser.css";
import rp from "./rp.png";
import { useUserStore } from "../../../../lib/stores/userStore.js";
import { db } from "../../../../lib/firebase.js";
import {
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import React, { useState } from "react";

const AddUser = ({ onAddChat }) => {
    const [user, setUser] = useState(null);
    const { currentUser } = useUserStore();

    const handleSearch = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get("username");

        try {
            const userRef = collection(db, "users");
            const q = query(userRef, where("username", "==", username));
            const querySnapShot = await getDocs(q);

            if (!querySnapShot.empty) {
                setUser(querySnapShot.docs[0].data());
            } else {
                setUser(null);
                console.log("No user found with that username.");
            }
        } catch (err) {
            console.log(err);
        }
    };

    const handleAdd = async () => {
        if (!user) return;

        const chatRef = collection(db, "chats");
        const userChatsRef = collection(db, "userChats");
        const batch = writeBatch(db);

        try {
            const newChatRef = doc(chatRef);
            await setDoc(newChatRef, {
                createdAt: serverTimestamp(),
                messages: [],
            });

            const userChatData = {
                chatId: newChatRef.id,
                lastMessage: "",
                receiverId: currentUser.id,
                updatedAt: new Date(), // Placeholder date
            };

            const currentUserChatData = {
                chatId: newChatRef.id,
                lastMessage: "",
                receiverId: user.id,
                updatedAt: new Date(), // Placeholder date
            };

            // Ensure the user document exists before updating
            const userDocRef = doc(userChatsRef, user.id);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                await setDoc(userDocRef, { chats: [] });
            }

            // Ensure the currentUser document exists before updating
            const currentUserDocRef = doc(userChatsRef, currentUser.id);
            const currentUserDoc = await getDoc(currentUserDocRef);
            if (!currentUserDoc.exists()) {
                await setDoc(currentUserDocRef, { chats: [] });
            }

            batch.update(userDocRef, {
                chats: arrayUnion(userChatData),
            });
            batch.update(currentUserDocRef, {
                chats: arrayUnion(currentUserChatData),
            });

            await batch.commit();

            // Update the timestamps separately
            await updateDoc(userDocRef, {
                "chats.$[element].updatedAt": serverTimestamp(),
            }, {
                arrayFilters: [{ "element.chatId": newChatRef.id }],
            });

            await updateDoc(currentUserDocRef, {
                "chats.$[element].updatedAt": serverTimestamp(),
            }, {
                arrayFilters: [{ "element.chatId": newChatRef.id }],
            });

            // Pass the new chat data back to ChatList
            onAddChat({
                ...currentUserChatData,
                user,
            });

            setUser(null); // Clear the search result after adding
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="addUser">
            <form onSubmit={handleSearch}>
                <input type="text" placeholder="Username" name="username" />
                <button>Search</button>
            </form>
            {user && (
                <div className="user">
                    <div className="detail">
                        <img src={user.avatar || rp} alt="" />
                        <span>{user.username}</span>
                    </div>
                    <button onClick={handleAdd}>Add User</button>
                </div>
            )}
        </div>
    );
};

export default AddUser;
