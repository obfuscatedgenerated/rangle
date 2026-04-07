"use client";

import {useCallback, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";

import {CircleUserRound} from "lucide-react";
import {LoadingSpinner} from "@/components/LoadingSpinner";

interface LoginDetails {
    id: string;
    username: string;
    email: string;
    avatar: string;
}

export const LoginButton = () => {
    const [origin, setOrigin] = useState<string | null>(null);
    const [user_info, setUserInfo] = useState<LoginDetails | null>(null);
    
    const search_params = useSearchParams();
    const router = useRouter();

    // TODO: this logic will almost certainly move to a context provider, this is just a basic test of the microservice integration and SSO flow
    const fetch_user_info = useCallback(
        () => {
            fetch("https://auth.ollieg.codes/me", {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("sso_token")}`
                }
            }).then(res => res.json()).then(data => {
                setUserInfo(data.user);
            }).catch((err) => {
                console.error("Failed to fetch user info", err);
                localStorage.removeItem("sso_token");
            });
        },
        [setUserInfo]
    );

    // set origin on mount
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        // currently the auth service will steer away redirects to localhost, so override the origin
        if (window.location.origin === "http://localhost:3000") {
            setOrigin("https://rangle.today");
            return;
        }

        setOrigin(window.location.origin);
    }, []);

    // if token in local storage, fetch user info
    useEffect(() => {
        if (localStorage.getItem("sso_token") && !user_info) {
            fetch_user_info();
        }
    }, [fetch_user_info, user_info]);

    // if token in search params, save it and fetch
    useEffect(() => {
        const token = search_params.get("token");
        if (token) {
            localStorage.setItem("sso_token", token);
            fetch_user_info();

            // remove token from url
            const url = new URL(window.location.href);
            url.searchParams.delete("token");
            router.replace(url.toString());
        }
    }, [search_params, fetch_user_info, router]);

    return (
        <>
            {user_info ?
                // TODO: this will be a proper menu later. for now just logout
                // TODO: need to clear token locally too!
                <a href={`https://auth.ollieg.codes/logout?from=${origin}`} title="Logout" className="cursor-pointer aspect-square w-8 h-8">
                    <img src={user_info?.avatar} className="w-full h-full rounded-full" title={user_info.username} draggable="false" alt="User Avatar" />
                </a>
                : origin ? (
                    <a href={`https://auth.ollieg.codes/login?from=${origin}`} className="cursor-pointer p-3 aspect-square w-8 h-8" title="Login">
                        <CircleUserRound />
                    </a>
                )
                : <LoadingSpinner />
            }
        </>
    );
}
