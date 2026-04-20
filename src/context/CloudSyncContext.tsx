"use client";

import {useAuth} from "@/context/AuthContext";

import {SaveState, SaveStateDay} from "@/context/RangleStateContext";
import {useRangleScores} from "@/context/RangleScoresContext";

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {GlobalStorage} from "@/util/globalStorage";
import {useSettings, Settings} from "@/context/SettingsContext";
import {cloud_bus, CLOUD_SYNC_EVENTS} from "@/util/event_bus";
import {LoadingSpinner} from "@/components/LoadingSpinner";
import {CircleAlert, Check, Ban} from "lucide-react";

const CLOUD_URL = "https://cloud.ollieg.codes";

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "error" | "ineligible" | "logged_out";
export const CLOUD_SYNC_STATUS_MESSAGES: Record<CloudSyncStatus, string> = {
    "idle": "Idle",
    "syncing": "Syncing...",
    "synced": "Synced",
    "error": "Error syncing",
    "ineligible": "Ineligible",
    "logged_out": "Log in to enable cloud sync"
}

export const CLOUD_SYNC_ICONS: Record<CloudSyncStatus, React.ComponentType<{className?: string, aria_hidden?: "true" | "false" | boolean}>> = {
    "idle": () => null,
    "syncing": ({className = "", aria_hidden = false}) => <LoadingSpinner aria_hidden={aria_hidden} className={`w-4! h-4! rounded-full bg-muted/50 animate-pulse ${className}`} label="Syncing to cloud..." />,
    "synced": ({className = "", aria_hidden = false}) => <Check aria-hidden={aria_hidden} className={`w-4 h-4 p-1 rounded-full bg-green-600 ${className}`} aria-label="Synced to cloud" />,
    "error": ({className = "", aria_hidden = false}) => <CircleAlert aria-hidden={aria_hidden} className={`w-4 h-4 p-0.5 rounded-full bg-red-500 ${className}`} aria-label="Error syncing to cloud" />,
    "ineligible": ({className = "", aria_hidden = false}) => <Ban aria-hidden={aria_hidden} className={`w-4 h-4 p-0.5 rounded-full bg-gray-700 ${className}`} aria-label="Not eligible for cloud sync" />,
    "logged_out": () => null,
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
    const {user_info, via_discord_activity} = useAuth();
    const {rebuild_scores} = useRangleScores();
    const {settings, update_settings} = useSettings();

    const [status, setStatus] = useState<CloudSyncStatus>("logged_out");
    const [last_synced, setLastSynced] = useState<Date | null>(null);
    const [error_message, setErrorMessage] = useState<string | null>(null);

    const cloud_url = useMemo(() => {
        if (via_discord_activity) {
            return "/.proxy/cloud";
        }

        return CLOUD_URL;
    }, [via_discord_activity]);

    const cloud = useMemo(() => new GlobalStorage("rangle", cloud_url), [cloud_url]);

    // check user eligibility
    useEffect(() => {
        if (!user_info) {
            setStatus("logged_out");
            return;
        }

        fetch(`${cloud_url}/endowment/globalStorage:*`, {
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
        (local: Settings, remote: Settings, local_updated: number, remote_updated: number) => {
            // return the newer of the two
            if (remote_updated > local_updated) {
                return remote;
            } else {
                return local;
            }
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

                const merged_state_str = JSON.stringify(merged_state);
                const local_changed = JSON.stringify(local_state) !== merged_state_str;
                const remote_changed = JSON.stringify(remote_state) !== merged_state_str;

                // update local and the cloud if there is actually data to send
                if (local_changed) {
                    // update local state with merged result
                    localStorage.setItem("rangle_state_v1", merged_state_str);
                    cloud_bus.emit(CLOUD_SYNC_EVENTS.RELOAD_LOCAL_STATE);

                    rebuild_scores();
                }

                if (remote_changed) {
                    await cloud.setItem("state", merged_state_str);
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

                let remote_updated = 0;
                if (remote_settings.updated) {
                    remote_updated = remote_settings.updated;
                    delete remote_settings.updated;
                }

                const merged_settings = merge_settings(local_settings, remote_settings, parseInt(localStorage.getItem("rangle_settings_updated_v1") || "0", 10), remote_updated);
                const merged_settings_str = JSON.stringify(merged_settings);

                const local_changed = JSON.stringify(local_settings) !== merged_settings_str;
                const remote_changed = JSON.stringify(remote_settings) !== merged_settings_str;

                if (local_changed) {
                    localStorage.setItem("rangle_settings_v1", merged_settings_str);
                    last_settings.current = merged_settings;
                    update_settings(merged_settings, remote_updated);
                }

                if (remote_changed) {
                    const settings_to_save = {
                        ...merged_settings,
                        updated: local_changed ? remote_updated : Date.now()
                    };
                    await cloud.setItem("settings", JSON.stringify(settings_to_save));
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
            if (status !== "idle" && status !== "synced") {
                return;
            }

            try {
                const remote_raw = await cloud.getItem("state");
                const remote_state = remote_raw ? JSON.parse(remote_raw) as SaveState : {};

                const new_remote_state = {
                    ...remote_state,
                    [date]: state
                };

                await cloud.setItem("state", JSON.stringify(new_remote_state));
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
