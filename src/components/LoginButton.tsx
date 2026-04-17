"use client";

import {LoadingSpinner} from "@/components/LoadingSpinner";
import {LoginPopup} from "@/components/LoginPopup";
import {AccountFlyout} from "@/components/AccountFlyout";

import {useAuth} from "@/context/AuthContext";

import {useState} from "react";
import {CircleUserRound} from "lucide-react";

export const LoginButton = ({className = ""}: { className?: string }) => {
    const {user_info, auth_origin} = useAuth();

    const [show_login_popup, setShowLoginPopup] = useState(false);
    const [show_account_flyout, setShowAccountFlyout] = useState(false);

    return (
        <>
            <LoginPopup open={show_login_popup} on_close={() => setShowLoginPopup(false)} />
            <AccountFlyout open={show_account_flyout} on_close={() => setShowAccountFlyout(false)} />

            <div className={`ml-4 flex items-center justify-center ${className}`}>
                {user_info ?
                    <button onClick={() => setShowAccountFlyout(true)} title="Logout" className="cursor-pointer aspect-square w-8 h-8">
                        <img src={user_info?.avatar} className="w-full h-full rounded-full" title="Account Menu" draggable="false" alt="User Avatar" />
                    </button>
                    : auth_origin ? (
                        <button onClick={() => setShowLoginPopup(true)} className="cursor-pointer aspect-square w-8 h-8 flex items-center justify-center" title="Login">
                            <CircleUserRound />
                        </button>
                    )
                    : <LoadingSpinner />
                }
            </div>
        </>
    );
}
