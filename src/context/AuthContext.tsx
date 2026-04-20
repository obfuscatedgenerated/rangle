"use client";

import {createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";

// TODO move this and time.js to next_public env
const AUTH_URL = "https://auth.ollieg.codes";
const ACTIVITY_CLIENT_ID = "1495567479978725476";

interface LoginDetails {
    id: string;
    username: string;
    email: string;
    avatar: string;
    provider: string;
}

interface AuthContextType {
    user_info: LoginDetails | null;
    auth_origin: string | null;
    login_url?: string;
    logout?: () => void;
    via_discord_activity: boolean;
    open_external_link?: (url: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    user_info: null,
    auth_origin: null,
    login_url: undefined,
    logout: undefined,
    via_discord_activity: false,
    open_external_link: undefined
});

// since search params have to be suspended but arent actually mission critical, just move that logic to a sub-component!
const AuthTokenHandler = ({ fetch_user_info }: { fetch_user_info: () => void }) => {
    const search_params = useSearchParams();
    const router = useRouter();

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

            // if the router didnt do it for some reason, do it manually
            if (window.location.search.includes("token=")) {
                window.history.replaceState({}, "", `/?${url.searchParams.toString()}`);
            }
        }
    }, [search_params, fetch_user_info, router]);

    return null;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [auth_origin, setAuthOrigin] = useState<string | null>(null);
    const [user_info, setUserInfo] = useState<LoginDetails | null>(null);

    const fetch_user_info = useCallback(
        () => {
            // if in discord activity, override auth url to proxy
            let auth_url = AUTH_URL;
            if (window.location.search.includes("instance_id=") || sessionStorage.getItem("via_discord_activity") === "true") {
                auth_url = "/.proxy/auth";
            }

            fetch(`${auth_url}/me`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("sso_token")}`
                }
            }).then(res => res.json()).then(data => {
                setUserInfo({
                    ...data.user,
                    provider: data.provider
                });
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

        setAuthOrigin(window.location.origin);
    }, []);

    // if token in local storage, fetch user info
    useEffect(() => {
        if (localStorage.getItem("sso_token") && !user_info) {
            fetch_user_info();
        }
    }, [fetch_user_info, user_info]);

    const login_url = useMemo(() => {
        if (!auth_origin) {
            return undefined;
        }
        return `${AUTH_URL}/login?from=${auth_origin}`;
    }, [auth_origin]);

    const loading_discord_activity = useRef(false);
    const [via_discord_activity, setViaDiscordActivity] = useState(false);

    const logout = useCallback(
        () => {
            if (via_discord_activity) {
                return;
            }
            
            localStorage.removeItem("sso_token");
            //setUserInfo(null);
            if (auth_origin) {
                window.location.href = `${AUTH_URL}/logout?from=${auth_origin}`;
            }
        },
        [auth_origin, via_discord_activity]
    );

    const DiscordSDK = useRef<typeof import("@discord/embedded-app-sdk").DiscordSDK | null>(null);
    const import_discord = useCallback(
        async (): Promise<typeof import("@discord/embedded-app-sdk").DiscordSDK> => {
            if (!DiscordSDK.current) {
                const {DiscordSDK: imp_sdk} = await import("@discord/embedded-app-sdk");
                DiscordSDK.current = imp_sdk;
            }
            
            return DiscordSDK.current;
        },
        []
    );
    
    const loaded_sdk = useRef<import("@discord/embedded-app-sdk").DiscordSDK | null>(null);
    const get_discord_sdk = useCallback(
        async () => {
            if (!loaded_sdk.current) {
                const SDKClass = await import_discord();
                loaded_sdk.current = new SDKClass(ACTIVITY_CLIENT_ID);
                await loaded_sdk.current.ready();
            }
            return loaded_sdk.current;
        },
        [import_discord]
    );

    const handle_discord_activity_login = useCallback(
        async () => {
            loading_discord_activity.current = true;

            // lazy load the sdk
            try {
                const sdk = await get_discord_sdk();

                // get the code
                const { code } = await sdk.commands.authorize({
                    client_id: ACTIVITY_CLIENT_ID,
                    response_type: "code",
                    scope: ["identify", "email"],
                    state: "",
                    prompt: "none",
                });

                // exchange code for token with auth service
                const res = await fetch("/.proxy/auth/login-discord-activity?activity=rangle", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ code })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem("sso_token", data.token);
                    
                    fetch_user_info();
                    setViaDiscordActivity(true);
                    sessionStorage.setItem("via_discord_activity", "true");
                } else {
                    console.error("Failed to exchange Discord activity code for token", await res.text());
                }
            } catch (err) {
                console.error("Error during Discord activity login", err);
            } finally {
                loading_discord_activity.current = false;
            }
        }, 
        [fetch_user_info, get_discord_sdk]
    );

    // handle discord activity auth
    useEffect(() => {
        const is_discord = typeof window !== "undefined" && window.location.search.includes("instance_id=");

        if (is_discord && !loading_discord_activity.current) {
            if (localStorage.getItem("sso_token")) {
                // if we already have a token, just fetch user info and set state
                fetch_user_info();
                setViaDiscordActivity(true);
                return;
            }
            
            handle_discord_activity_login();
        }
    }, [fetch_user_info, handle_discord_activity_login]);

    const open_external_link = useCallback(
        (url: string) => {
            if (!via_discord_activity && !window.location.search.includes("instance_id=") && sessionStorage.getItem("via_discord_activity") !== "true") {
                window.open(url, "_blank", "noopener noreferrer");
                return;
            }

            get_discord_sdk().then(async sdk => {
                await sdk.commands.openExternalLink({
                    url
                });
            }).catch(err => {
                console.error("Failed to open external link with Discord SDK", err);
            });
        },
        [get_discord_sdk, via_discord_activity]
    );

    return (
        <AuthContext.Provider value={{ user_info, auth_origin, login_url, logout, via_discord_activity, open_external_link }}>
            <Suspense fallback={null}>
                <AuthTokenHandler fetch_user_info={fetch_user_info} />
            </Suspense>

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
