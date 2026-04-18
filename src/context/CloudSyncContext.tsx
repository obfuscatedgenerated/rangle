"use client";

import {useAuth} from "@/context/AuthContext";

import type {SaveStateDay} from "@/hooks/useRangleState";
import {useRangleScores} from "@/context/RangleScoresContext";

import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {GlobalStorage} from "@/util/globalStorage";

const CLOUD_URL = "https://cloud.ollieg.codes";

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "error" | "ineligible" | "logged_out";
export const CLOUD_SYNC_STATUS_MESSAGES: Record<CloudSyncStatus, string> = {
    "idle": "Idle",
    "syncing": "Syncing...",
    "synced": "Last synced at",
    "error": "Error syncing",
    "ineligible": "Ineligible",
    "logged_out": "Log in to enable cloud sync"
}

interface CloudSyncContextType {
    status: CloudSyncStatus;
    last_synced: Date | null;
    error_message: string | null;

    trigger_sync: () => void;
    push_update: (date: string, state: SaveStateDay) => void;
}

const CloudSyncContext = createContext<CloudSyncContextType | undefined>(undefined);

export const CloudSyncProvider = ({ children }: { children: React.ReactNode }) => {
    const { user_info } = useAuth();
    const { rebuild_scores } = useRangleScores();

    const [status, setStatus] = useState<CloudSyncStatus>("logged_out");
    const [last_synced, setLastSynced] = useState<Date | null>(null);
    const [error_message, setErrorMessage] = useState<string | null>(null);

    const cloud = useMemo(() => new GlobalStorage("rangle", CLOUD_URL), []);

    // check user eligibility
    useEffect(() => {
        if (!user_info) {
            setStatus("logged_out");
            return;
        }
        
        fetch(`${CLOUD_URL}/endowment/globalStorage:*`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("sso_token")}`
            }
        }).then(res => {
            if (res.ok) {
                res.text().then(text => {
                    if (text.trim() === "true") {
                        setStatus("idle");
                    } else {
                        setStatus("ineligible");
                        setErrorMessage("You don't have access to cloud sync.")
                    }
                });
            } else if (res.status === 403) {
                setStatus("ineligible");
            } else {
                throw new Error(`Unexpected response: ${res.status}`);
            }
        }).catch((err) => {
            console.error("Failed to check cloud sync eligibility", err);
            setStatus("error");
            setErrorMessage("Failed to check cloud sync eligibility");
        });
    }, [user_info]);

    return (
        <CloudSyncContext.Provider value={{
            status,
            last_synced,
            error_message,
            trigger_sync: () => {},
            push_update: (date: string, state: SaveStateDay) => {}
        }}>
            {children}
        </CloudSyncContext.Provider>
    );
}

export const useCloudSync = () => {
    const context = useContext(CloudSyncContext);

    if (!context) {
        throw new Error("useCloudSync must be used within a CloudSyncProvider");
    }

    return context;
}
