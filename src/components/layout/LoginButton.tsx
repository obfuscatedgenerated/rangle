"use client";

import {LoadingSpinner} from "@/components/ui/LoadingSpinner";
import {LoginPopup} from "@/features/popup/LoginPopup";
import {AccountFlyout} from "@/components/layout/AccountFlyout";

import {useAuth} from "@/context/AuthContext";
import {CLOUD_SYNC_ICONS, useCloudSync} from "@/context/CloudSyncContext";

import {useState} from "react";
import {CircleUserRound} from "lucide-react";

export const LoginButton = ({className = ""}: { className?: string }) => {
    const {user_info, auth_origin} = useAuth();

    const [show_login_popup, setShowLoginPopup] = useState(false);
    const [show_account_flyout, setShowAccountFlyout] = useState(false);

    const {status} = useCloudSync();
    const StatusIcon = CLOUD_SYNC_ICONS[status];

    return (
        <>
            <LoginPopup open={show_login_popup} on_close={() => setShowLoginPopup(false)} />
            <AccountFlyout open={show_account_flyout} on_close={() => setShowAccountFlyout(false)} />

            <div className={`ml-4 flex items-center justify-center ${className}`}>
                {user_info ?
                    <button onClick={() => setShowAccountFlyout(true)} title="Account Menu" className="cursor-pointer aspect-square w-8 h-8 relative border border-gray-700 rounded-full">
                        {user_info?.avatar && <img src={user_info?.avatar} className="w-full h-full rounded-full" draggable="false" alt="User Avatar" />}
                        {!user_info?.avatar && <span className="flex items-center justify-center w-full h-full rounded-full bg-gray-800 text-foreground uppercase">{user_info.username?.[0] || "?"}</span>}
                        <StatusIcon className="absolute -top-1 -right-1" />
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
