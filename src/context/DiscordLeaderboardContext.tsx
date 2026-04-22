"use client";

import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
import {DEFAULT_DISCORD_SCOPES, useAuth} from "@/context/AuthContext";
import {ACTIVITY_CLIENT_ID, get_discord_sdk} from "@/util/discord";
import {CLOUD_URL} from "@/context/CloudSyncContext";

export interface LeaderboardEntry {
    user_id: string;
    n_attempts: number;
    hardcore: boolean;
    n_correct_bonus: number
}

interface DiscordLeaderboardContextType {
    get_leaderboard: (iso_date: string) => Promise<LeaderboardEntry[] | null>;

    current_guild_id: string | null;
    current_guild_data: { name: string; icon?: string } | null;
}

const DiscordLeaderboardContext = createContext<DiscordLeaderboardContextType>({
    get_leaderboard: async () => null,

    current_guild_id: null,
    current_guild_data: null,
});

export const DiscordLeaderboardProvider = ({ children }: { children: React.ReactNode }) => {
    const {via_discord_activity} = useAuth();

    const [current_guild_id, setCurrentGuildId] = useState<string | null>(null);
    const [current_guild_data, setCurrentGuildData] = useState<{ name: string; icon?: string } | null>(null);

    useEffect(() => {
        if (!via_discord_activity) {
            return;
        }

        get_discord_sdk().then(sdk => {
            setCurrentGuildId(sdk.guildId);
        });
    }, [via_discord_activity]);

    const leaderboard_grant = useRef<string | null>(null);

    const get_leaderboard = useCallback(
        async (iso_date: string) => {
            if (!current_guild_id) {
                return null;
            }

            // if we don't have a grant, then need to resync guilds to get one
            // this is for 2 reasons:
            // 1. we need to ask for the guilds scope
            // 2. the leaderboard access intentionally expires after 10 minutes to account for users leaving guilds and the database not yet updating to that,
            // so we force them to resync their guilds every 10 mins to account for this (only care about doing it when they view the leaderboard tho, invoked with this function)
            if (!leaderboard_grant.current) {
                // authorise with guilds scope
                const sdk = await get_discord_sdk();

                // get the code
                const {code} = await sdk.commands.authorize({
                    client_id: ACTIVITY_CLIENT_ID,
                    response_type: "code",
                    scope: [...DEFAULT_DISCORD_SCOPES, "guilds"],
                    state: "",
                });

                // resync guilds and obtain the leaderboard grant, expiry time, and guilds map
                const res = await fetch(`${CLOUD_URL}/rangle/sync_guilds`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("sso_token")}`
                    },
                    body: JSON.stringify({code})
                });

                if (!res.ok) {
                    throw new Error("Failed to escalate permissions: " + await res.text());
                }

                const data = await res.json();
                leaderboard_grant.current = data.token;

                setCurrentGuildData(data.guilds[current_guild_id!]);

                // clear the grant at the expiry time
                const expiry_time = data.expires_at * 1000;
                const now = Date.now();
                setTimeout(() => {
                    leaderboard_grant.current = null;
                }, expiry_time - now);
            }

            // now we can fetch the leaderboard for this guild with the grant
            const res = await fetch(`${CLOUD_URL}/rangle/guilds/${current_guild_id}/leaderboard/${iso_date}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("sso_token")}`,
                    "X-Leaderboard-Grant": leaderboard_grant.current!
                }
            });

            if (!res.ok) {
                throw new Error("Failed to fetch leaderboard: " + await res.text());
            }

            const data = await res.json();
            return data as LeaderboardEntry[];
        },
        [current_guild_id]
    );

    return (
        <DiscordLeaderboardContext.Provider value={{ get_leaderboard, current_guild_id, current_guild_data }}>
            {children}
        </DiscordLeaderboardContext.Provider>
    );
}

export const useDiscordLeaderboard = () => {
    const context = useContext(DiscordLeaderboardContext);
    if (!context) {
        throw new Error("useDiscordLeaderboard must be used within a DiscordLeaderboardProvider");
    }
    return context;
}
