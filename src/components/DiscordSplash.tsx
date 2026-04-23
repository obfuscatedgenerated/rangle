"use client";

import {get_discord_sdk, in_discord_activity} from "@/util/discord";

import {useEffect, useMemo, useState} from "react";
import Image from "next/image";

export const DiscordSplash = () => {
    const in_discord = useMemo(() => in_discord_activity(), []);
    const [show_splash, setShowSplash] = useState(false);

    // subscribe to layout events from discord to show when in PIP
    useEffect(() => {
        if (!in_discord) {
            return;
        }

        const listener = ({layout_mode}: { layout_mode: number }) => {
            if (layout_mode === 1) {
                setShowSplash(true);
            } else {
                setShowSplash(false);
            }
        };

        get_discord_sdk().then(sdk => {
            sdk.subscribe("ACTIVITY_LAYOUT_MODE_UPDATE", listener).catch(err => {
                console.error("Failed to subscribe to Discord layout events", err);
            });
        });

        return () => {
            get_discord_sdk().then(sdk => {
                sdk.unsubscribe("ACTIVITY_LAYOUT_MODE_UPDATE", listener).catch(err => {
                    console.error("Failed to unsubscribe from Discord layout events", err);
                });
            });
        };
    }, [in_discord]);

    if (!in_discord) {
        return null;
    }

    return (
        <div className={`fixed top-0 left-0 h-screen w-screen bg-background flex items-center justify-center p-4 z-99999 pointer-events-none transition-opacity duration-500 ${show_splash ? "opacity-100" : "opacity-0"}`}>
            <Image src="/icon.svg" alt="Rangle Logo" width={128} height={128} />
            <p className="font-title font-bold text-2xl tracking-wider">Rangle</p>
        </div>
    );
}
