"use client";

import {CircleUserRound} from "lucide-react";
import {LoadingSpinner} from "@/components/LoadingSpinner";

import {useAuth} from "@/context/AuthContext";

export const LoginButton = ({className = ""}: { className?: string }) => {
    const {user_info, auth_origin, login_url, logout} = useAuth();

    return (
        <div className={`ml-4 flex items-center justify-center ${className}`}>
            {user_info ?
                // TODO: this will be a proper menu later. for now just logout
                <button onClick={logout} title="Logout" className="cursor-pointer aspect-square w-8 h-8">
                    <img src={user_info?.avatar} className="w-full h-full rounded-full" title={user_info.username} draggable="false" alt="User Avatar" />
                </button>
                : auth_origin ? (
                    <a href={login_url} className="cursor-pointer aspect-square w-8 h-8 flex items-center justify-center" title="Login">
                        <CircleUserRound />
                    </a>
                )
                : <LoadingSpinner />
            }
        </div>
    );
}
