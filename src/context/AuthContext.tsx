"use client";

import {createContext, useCallback, useContext, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";

interface LoginDetails {
    id: string;
    username: string;
    email: string;
    avatar: string;
}

interface AuthContextType {
    user_info: LoginDetails | null;
    auth_origin: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user_info: null,
    auth_origin: null
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [auth_origin, setAuthOrigin] = useState<string | null>(null);
    const [user_info, setUserInfo] = useState<LoginDetails | null>(null);

    const search_params = useSearchParams();
    const router = useRouter();

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
        if (window.location.origin === "http://localhost:3000" || window.location.origin === "http://127.0.0.1:3000") {
            setAuthOrigin("https://rangle.today");
            return;
        }

        setAuthOrigin(window.location.origin);
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
        <AuthContext.Provider value={{ user_info, auth_origin }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
