import {ViewTransition} from "react";

import {RangleScoresProvider} from "@/context/RangleScoresContext";
import {SettingsProvider} from "@/context/SettingsContext";
import {ThemeApplier} from "@/components/ThemeApplier";
import {ContextProviders} from "@/components/ContextProviders";
import {AuthProvider} from "@/context/AuthContext";
import {CloudSyncProvider} from "@/context/CloudSyncContext";
import {RangleStateProvider} from "@/context/RangleStateContext";
import {DiscordLeaderboardProvider} from "@/context/DiscordLeaderboardContext";
import {DiscordSplash} from "@/components/DiscordSplash";

export default function GameLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ContextProviders providers={[
            RangleScoresProvider,
            SettingsProvider,
            AuthProvider,
            CloudSyncProvider,
            RangleStateProvider,
            DiscordLeaderboardProvider
        ]}>
            <ThemeApplier />
            <DiscordSplash />

            <ViewTransition name="zoom-and-fade">
                {children}
            </ViewTransition>
        </ContextProviders>
    );
}
