"use client";

import type {DiscordSDK} from "@discord/embedded-app-sdk";

import {get_discord_sdk, in_discord_activity} from "@/util/discord";
import {useEffect} from "react";
import {useAuth} from "@/context/AuthContext";

export type Activity = Parameters<DiscordSDK["commands"]["setActivity"]>[0]["activity"];

interface DiscordPresenceProps {
    activity?: Activity;
}

export const DiscordPresence = ({activity}: DiscordPresenceProps) => {
    const {via_discord_activity} = useAuth();

    useEffect(() => {
        if (!via_discord_activity || !activity) {
            return;
        }

        get_discord_sdk().then(sdk => {
            sdk.commands.setActivity({ activity }).catch(err => {
                console.error("Failed to set Discord activity", err);
            });
        });
    }, [activity, via_discord_activity]);

    return null;
}
