import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "react-toastify";
import { auth } from "../../lib/firebase.js";
import { friendlyAuthError } from "../../lib/authErrors.js";
import logo from "./logo.png";

const Login = ({ onSwitchToRegister }) => {
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { email, password } = Object.fromEntries(new FormData(e.target));
        try {
            // The auth listener in useUserStore switches the app to the main view.
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error(err);
            toast.error(friendlyAuthError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex gap-12 items-center box-border">
            <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4 sm:p-8 md:p-12 box-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                    {/* Left Column: Login Form */}
                    <div className="flex flex-col items-center justify-center">
                        <form
                            onSubmit={handleLogin}
                            className="flex flex-col items-center gap-6 w-full sm:w-4/5 bg-white rounded-2xl p-6 sm:p-8 shadow-lg"
                        >
                            <h2 className="text-2xl font-semibold text-[rgb(171,59,45)]">Welcome Back!</h2>
                            <input
                                type="email"
                                placeholder="Email"
                                name="email"
                                autoComplete="email"
                                required
                                className="w-full p-4 bg-[rgba(17,25,40,0.8)] text-white rounded-full outline-none focus:ring-2 focus:ring-[rgb(171,59,45)] placeholder-white placeholder-opacity-80 transition-all duration-300"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                name="password"
                                autoComplete="current-password"
                                required
                                className="w-full p-4 bg-[rgba(17,25,40,0.8)] text-white rounded-full outline-none focus:ring-2 focus:ring-[rgb(171,59,45)] placeholder-white placeholder-opacity-80 transition-all duration-300"
                            />
                            <button
                                disabled={loading}
                                className="w-3/5 p-4 bg-[#1f8ef1] rounded-full text-white font-semibold disabled:bg-[#1f8ff1a9] disabled:cursor-not-allowed hover:bg-[#1a7cd9] transition-colors duration-300"
                            >
                                {loading ? "Loading..." : "Sign In"}
                            </button>
                            <button
                                type="button"
                                onClick={onSwitchToRegister}
                                className="text-base text-[rgb(171,59,45)] bg-transparent border-none hover:underline transition-all duration-200"
                            >
                                Don’t have an account? Register here
                            </button>
                        </form>
                    </div>

                    {/* Right Column: Logo and Branding */}
                    <div className="hidden md:flex flex-col items-center justify-between w-full bg-white rounded-2xl shadow-lg p-6">
                        <img
                            src={logo}
                            alt="Talkie Logo"
                            className="h-48 w-48 object-cover rounded-full drop-shadow-lg transform hover:scale-105 transition-transform duration-300"
                        />
                        <div className="text-center text-[rgb(171,59,45)]">
                            <h1 className="text-xl md:text-2xl font-bold">
                                 Your Best <br /> Chatting Experience
                            </h1>
                        </div>
                        <div className="flex justify-between w-full text-[rgb(171,59,45)] text-sm mt-8">
                            <span>PromCode</span>
                            <span>© 2024 Talkie</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
