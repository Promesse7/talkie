import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth, db } from "../../lib/firebase.js";
import { useUserStore } from "../../lib/stores/userStore.js";
import { friendlyAuthError } from "../../lib/authErrors.js";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "../../lib/languages.js";
import upload from "../../lib/upload.js";
import profile from "./rp.png";
import logo from "./logo.png";

const inputClass =
    "border-none outline-none p-5 pl-8 bg-[rgba(17,25,40,0.753)] text-white rounded-full w-4/5 placeholder-white placeholder-opacity-100";

const Register = ({ onSwitchToLogin }) => {
    const [avatar, setAvatar] = useState({ file: null, url: "" });
    const [loading, setLoading] = useState(false);
    const setRegistering = useUserStore((s) => s.setRegistering);

    const handleAvatar = (e) => {
        const file = e.target.files?.[0];
        if (file) setAvatar({ file, url: URL.createObjectURL(file) });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setRegistering(true);
        const { username, email, password, preferredLanguage } = Object.fromEntries(new FormData(e.target));

        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);

            let avatarUrl = "";
            if (avatar.file) {
                try {
                    avatarUrl = await upload(avatar.file, `avatars/${res.user.uid}/${Date.now()}_${avatar.file.name}`);
                } catch (uploadError) {
                    console.error(uploadError);
                    toast.error("Avatar upload failed. Using the default image.");
                }
            }

            await setDoc(doc(db, "users", res.user.uid), {
                id: res.user.uid,
                username: username.trim(),
                email,
                avatar: avatarUrl,
                blocked: [],
                preferredLanguage: preferredLanguage || DEFAULT_LANGUAGE,
                createdAt: serverTimestamp(),
            });

            toast.success("Account created! Welcome to Talkie.");
        } catch (err) {
            console.error(err);
            toast.error(friendlyAuthError(err));
        } finally {
            setRegistering(false);
            setLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex gap-24 items-center">
            <div className="hidden md:flex flex-col items-center w-full h-full bg-white">
                <img src={logo} alt="Talkie Logo" className="h-[200px] w-[200px] filter drop-shadow-lg" />
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
                            alt="Profile preview"
                            className="h-12 w-12 rounded-lg object-cover opacity-60"
                        />
                        Upload an image
                    </label>
                    <input type="file" id="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                    <input type="text" placeholder="Username" name="username" autoComplete="username" required className={inputClass} />
                    <input type="email" placeholder="Email" name="email" autoComplete="email" required className={inputClass} />
                    <input type="password" placeholder="Password" name="password" autoComplete="new-password" required minLength={6} className={inputClass} />
                    <label htmlFor="preferredLanguage" className="w-4/5 text-sm text-[rgb(171,59,45)] -mb-3">
                        Show me messages in
                        <span className="block text-xs text-gray-500 font-normal">
                            What others write is translated into this language for you. What you write is
                            never changed on your screen.
                        </span>
                    </label>
                    <select
                        id="preferredLanguage"
                        name="preferredLanguage"
                        defaultValue={DEFAULT_LANGUAGE}
                        className={inputClass}
                    >
                        {SUPPORTED_LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                                {l.name} · {l.nativeName}
                            </option>
                        ))}
                    </select>
                    <button
                        className="w-3/5 p-5 border-none bg-[#1f8ef1] hover:bg-[#1a7cd9] rounded-full text-white cursor-pointer font-light disabled:bg-[#1f8ff1a9] disabled:cursor-not-allowed"
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
