"use client";

import {useAuth} from "@/context/AuthContext";

import {X} from "lucide-react";
import {Scrim} from "@/components/Scrim";

interface AccountFlyoutProps {
    open: boolean;
    on_close: () => void;
}

export const AccountFlyout = ({open, on_close}: AccountFlyoutProps) => {
    const {user_info, logout} = useAuth();

    if (!user_info) {
        return null;
    }

    return (
        <>
            <Scrim className={`fixed top-0 left-0 w-full h-full bg-black/50 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={on_close} />
            <div aria-hidden={!open} className={`z-9999 fixed top-0 right-0 w-100 h-full bg-background-variant p-4 transition-transform duration-500 transform ${open ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="font-bold text-xl">Account</h2>

                    <button onClick={on_close} className="cursor-pointer p-1" title="Close">
                        <X />
                    </button>
                </div>

                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                        <img src={user_info.avatar} className="w-8 h-8 rounded-full" title={user_info.username} draggable="false" alt="User Avatar" />
                        <b>{user_info.username}</b>

                        <span className="opacity-75">({user_info.provider})</span>
                    </div>

                    <button onClick={logout} className="mt-4 px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer">
                        Log out
                    </button>

                    <hr className="w-full border-t border-arrow-middle my-4" />

                    <h3 className="font-bold text-lg">Cloud Sync</h3>

                    <p>Status: <b>Ineligible</b></p>
                </div>
            </div>
        </>
    );
}
