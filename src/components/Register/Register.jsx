import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase.js";
import { doc, setDoc } from "firebase/firestore";
import { useChatStore } from "../../lib/stores/chatStore.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import profile from "./rp.png";
import logo from "./logo.png";
import Upload from "../../lib/upload.js";

const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {
    const [avatar, setAvatar] = useState({ file: null, url: "" });
    const [loading, setLoading] = useState(false);
    const { setCurrentUser } = useChatStore();

    const handleAvatar = e => {
        if (e.target.files[0]) {
            setAvatar({
                file: e.target.files[0],
                url: URL.createObjectURL(e.target.files[0])
            });
        }
    };

    const handleRegister = async e => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const { username, email, password } = Object.fromEntries(formData);

        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            let imgUrl = profile;

            if (avatar.file) {
                try {
                    imgUrl = await Upload(avatar.file, res.user.uid);
                } catch (uploadError) {
                    console.log(uploadError);
                    toast.error("Failed to upload avatar. Using default image.");
                }
            }

            const userData = {
                username,
                email,
                avatar: imgUrl,
                id: res.user.uid,
                blocked: [],
            };

            await setDoc(doc(db, "users", res.user.uid), userData);
            await setDoc(doc(db, "userchats", res.user.uid), { chats: [] });

            setCurrentUser(userData);
            toast.success("Account created! You are now logged in.");
            onRegisterSuccess();
        } catch (err) {
            console.log(err);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex gap-24 items-center">
            <div className="hidden md:flex flex-col items-center w-full h-full bg-white">
                <img 
                    src={logo} 
                    alt="Talkie Logo" 
                    className="h-[200px] w-[200px] filter drop-shadow-lg" 
                />
                <div className="mt-[30vh] text-[rgb(171,59,45)] text-center">
                    <h1>Talkie your best chatting <br /> experience.</h1>
                </div>
                <div className="flex justify-between w-full text-[rgb(171,59,45)] p-5 box-border mt-24">
                    <span>PromCode</span>
                    <span>copyright 2024</span>
                </div>
            </div>

            <hr className="hidden md:block border border-[rgb(171,59,45)]" />

            <div className="flex flex-col items-center border-b-0 gap-5">
                <h2 className="text-[rgb(171,59,45)]">Create an account!</h2>
                <form 
                    onSubmit={handleRegister}
                    className="flex flex-col items-center justify-center gap-5 w-full md:w-[500px] bg-white rounded-2xl p-5"
                >
                    <label 
                        htmlFor="file" 
                        className="text-[rgb(171,59,45)] flex w-4/5 items-center justify-between underline cursor-pointer -translate-y-2"
                    >
                        <img 
                            src={avatar.url || profile} 
                            alt="Profile" 
                            className="h-12 w-12 rounded-lg object-cover opacity-60" 
                        />
                        Upload an image
                    </label>
                    <input 
                        type="file" 
                        id="file" 
                        className="hidden" 
                        onChange={handleAvatar} 
                    />
                    <input 
                        type="text" 
                        placeholder="Username" 
                        name="username" 
                        required 
                        className="border-none outline-none p-5 pl-8 bg-[rgba(17,25,40,0.753)] text-white rounded-full w-4/5 placeholder-white placeholder-opacity-100"
                    />
                    <input 
                        type="email" 
                        placeholder="Email" 
                        name="email" 
                        required 
                        className="border-none outline-none p-5 pl-8 bg-[rgba(17,25,40,0.753)] text-white rounded-full w-4/5 placeholder-white placeholder-opacity-100"
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        name="password" 
                        required 
                        className="border-none outline-none p-5 pl-8 bg-[rgba(17,25,40,0.753)] text-white rounded-full w-4/5 placeholder-white placeholder-opacity-100"
                    />
                    <button 
                        className="w-3/5 p-5 border-none bg-[#1f8ef1] hover:bg-[#1f8ef1] rounded-full text-white cursor-pointer font-light disabled:bg-[#1f8ff1a9] disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Sign Up"}
                    </button>
                    <button 
                        type="button"
                        onClick={onSwitchToLogin}
                        className="font-sans text-xs bg-transparent border-none outline-none text-[rgb(171,59,45)]"
                    >
                        Already have an account? Login here
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;