"use client";

import {useAuth} from "@/context/AuthContext";

import type {SaveState, SaveStateDay} from "@/hooks/useRangleState";
import {useRangleScores} from "@/context/RangleScoresContext";

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {GlobalStorage} from "@/util/globalStorage";
import {useSettings, Settings} from "@/context/SettingsContext";

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

    trigger_state_sync: () => void;
    trigger_settings_sync: () => void;
    trigger_full_sync: () => void;
    push_update: (date: string, state: SaveStateDay) => void;
}

const CloudSyncContext = createContext<CloudSyncContextType | undefined>(undefined);

export const CloudSyncProvider = ({children}: { children: React.ReactNode }) => {
    const {user_info} = useAuth();
    const {rebuild_scores} = useRangleScores();
    const {settings, update_settings} = useSettings();

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

    const merge_states = useCallback(
        (local: SaveState, remote: SaveState) => {
            const merged: SaveState = {...local};

            const is_finished = (day: SaveStateDay) =>
                day.attempts.length >= 5 ||
                (day.attempts.length > 0 && day.attempts[day.attempts.length - 1].every(pos => pos));

            const get_date_or_1970 = (day: SaveStateDay) =>
                day.updated ? new Date(day.updated) : new Date(0);

            for (const date in remote) {
                if (!merged[date]) {
                    merged[date] = {...remote[date]};
                } else {
                    const local_day = merged[date];
                    const remote_day = remote[date];
                    let chosen: SaveStateDay;

                    // choose the older game if either is finished to prevent cheating
                    if (is_finished(local_day) || is_finished(remote_day)) {
                        if (is_finished(local_day) && is_finished(remote_day)) {
                            chosen = get_date_or_1970(local_day) < get_date_or_1970(remote_day)
                                ? local_day
                                : remote_day;
                        } else {
                            chosen = is_finished(remote_day) ? remote_day : local_day;
                        }
                    }

                    // if both are unfinished, then instead pick the newer one, first by attempt count, then falling back to updated timestamp, then to remote
                    else if (remote_day.attempts.length < local_day.attempts.length) {
                        chosen = local_day;
                    } else if (remote_day.updated && local_day.updated && new Date(remote_day.updated) < new Date(local_day.updated)) {
                        chosen = local_day;
                    } else {
                        chosen = remote_day;
                    }

                    // merge bonus results, with priority on the chosen day to prevent losing bonus progress due to syncing from an older one where the round wasnt played
                    merged[date] = {
                        ...chosen,
                        bonus_results: {
                            ...(local_day.bonus_results || {}),
                            ...(remote_day.bonus_results || {}),
                            ...(chosen.bonus_results || {})
                        }
                    };
                }
            }
            return merged;
        },
        []
    );
    
    const merge_settings = useCallback(
        (local: Settings, remote: Settings, priority_local = true) => {
            // for now just union with priority, but in future might be worth adding timestamps
            return priority_local
                ? { ...remote, ...local }
                : { ...local, ...remote };
        },
        []
    );

    const trigger_state_sync = useCallback(
        async (check_not_syncing = true) => {
            if (status === "ineligible" || status === "logged_out" || (status === "syncing" && check_not_syncing)) {
                return;
            }

            if (!user_info) {
                setStatus("logged_out");
                return;
            }

            setStatus("syncing");
            setErrorMessage(null);

            try {
                // make a local backup just in case
                const local_raw = localStorage.getItem("rangle_state_v1");
                if (local_raw) {
                    localStorage.setItem("rangle_state_v1_bup", local_raw);
                }

                const local_state = JSON.parse(local_raw || "{}") as SaveState;

                const remote_raw = await cloud.getItem("state");
                const remote_state = remote_raw ? JSON.parse(remote_raw) as SaveState : {};

                const merged_state = merge_states(local_state, remote_state);

                // update local and the cloud if there is actually data to send
                if (JSON.stringify(merged_state) !== JSON.stringify(remote_state)) {
                    // update local state with merged result
                    // TODO: update the state hook. might need to convert it to context
                    localStorage.setItem("rangle_state_v1", JSON.stringify(merged_state));
                    
                    await cloud.setItem("state", JSON.stringify(merged_state));

                    rebuild_scores();
                }

                setLastSynced(new Date());
                setStatus("synced");
            } catch (err) {
                console.error("Failed to sync with cloud", err);
                setErrorMessage(`Failed to sync with cloud: ${err instanceof Error ? err.message : String(err)}`);
                setStatus("error");
            }
        },
        [cloud, merge_states, rebuild_scores, status, user_info]
    );
    
    const trigger_settings_sync = useCallback(
        async (check_not_syncing = true) => {
            if (status === "ineligible" || status === "logged_out" || (status === "syncing" && check_not_syncing)) {
                return;
            }

            if (!user_info) {
                setStatus("logged_out");
                return;
            }

            setStatus("syncing");
            setErrorMessage(null);

            try {
                const local_raw = localStorage.getItem("rangle_settings_v1");

                if (local_raw) {
                    // make a local backup just in case
                    localStorage.setItem("rangle_settings_v1_bup", local_raw);
                }

                const local_settings = local_raw ? JSON.parse(local_raw) : {};

                const remote_raw = await cloud.getItem("settings");
                const remote_settings = remote_raw ? JSON.parse(remote_raw) : {};

                const merged_settings = merge_settings(local_settings, remote_settings);

                if (JSON.stringify(merged_settings) !== JSON.stringify(remote_settings)) {
                    localStorage.setItem("rangle_settings_v1", JSON.stringify(merged_settings));
                    await cloud.setItem("settings", JSON.stringify(merged_settings));

                    update_settings(merged_settings);
                }

                setLastSynced(new Date());
                setStatus("synced");
            } catch (err) {
                console.error("Failed to sync settings with cloud", err);
                setErrorMessage(`Failed to sync settings with cloud: ${err instanceof Error ? err.message : String(err)}`);
                setStatus("error");
            }
        },
        [cloud, merge_settings, update_settings, status, user_info]
    );
    
    const trigger_full_sync = useCallback(
        async () => {
            if (status === "ineligible" || status === "logged_out" || status === "syncing") {
                return;
            }
    
            await Promise.all([
                trigger_state_sync(false),
                trigger_settings_sync(false)
            ]);
        }, 
        [status, trigger_settings_sync, trigger_state_sync]
    );

    const push_update = useCallback(
        async (date: string, state: SaveStateDay) => {
            if (status !== "synced") {
                return;
            }

            try {
                const remote_raw = await cloud.getItem("state");
                const remote_state = remote_raw ? JSON.parse(remote_raw) as SaveState : {};

                const local_raw = localStorage.getItem("rangle_state_v1");
                const local_state = local_raw ? JSON.parse(local_raw) as SaveState : {};

                const new_remote_state = {
                    ...remote_state,
                    [date]: state
                };

                const new_local_state = {
                    ...local_state,
                    [date]: state
                };

                await cloud.setItem("state", JSON.stringify(new_remote_state));
                localStorage.setItem("rangle_state_v1", JSON.stringify(new_local_state));

                setLastSynced(new Date());
            } catch (err) {
                console.error("Failed to push update to cloud", err);
                setErrorMessage(`Failed to push update to cloud: ${err instanceof Error ? err.message : String(err)}`);
                setStatus("error");
            }
        },
        [cloud, status]
    );

    const is_syncing_settings = useRef(false);
    const last_settings = useRef<Settings>(settings);
    const settings_sync_debounce = useRef<NodeJS.Timeout | null>(null);

    // automatically sync settings when they change
    useEffect(() => {
        if ((status !== "idle" && status !== "synced") || JSON.stringify(settings) === JSON.stringify(last_settings.current)) {
            return;
        }

        if (settings_sync_debounce.current) {
            clearTimeout(settings_sync_debounce.current);
        }

        settings_sync_debounce.current = setTimeout(() => {
            if (is_syncing_settings.current) {
                return;
            }

            is_syncing_settings.current = true;
            last_settings.current = settings;
            trigger_settings_sync().finally(() => {
                is_syncing_settings.current = false;
            });
        }, 750);
    }, [settings, status, trigger_settings_sync]);

    return (
        <CloudSyncContext.Provider value={{
            status,
            last_synced,
            error_message,
            trigger_state_sync,
            trigger_settings_sync,
            trigger_full_sync,
            push_update
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
