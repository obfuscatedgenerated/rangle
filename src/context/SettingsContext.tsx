"use client";

import {createContext, useContext, useEffect, useState} from "react";
import type {ThemeID} from "@/themes";

const DEFAULT_SETTINGS = {
    default_hardcore: false as boolean,
    theme: "default" as ThemeID,
    sound: true as boolean,
} as const;

export type Settings = typeof DEFAULT_SETTINGS;

interface SettingsContextType {
    settings: Settings;
    update_settings: (new_settings: Partial<Settings>, timestamp?: number) => void;
    last_updated: number | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [last_updated, setLastUpdated] = useState<number | null>(null);

    // load settings from localStorage on initial mount
    useEffect(() => {
        const settings_raw = localStorage.getItem("rangle_settings_v1");
        if (settings_raw) {
            try {
                const parsed_settings = JSON.parse(settings_raw);
                setSettings((prev) => ({ ...prev, ...parsed_settings }));
            } catch (err) {
                console.error("Error parsing settings from localStorage:", err);
            }
        }

        const settings_updated_raw = localStorage.getItem("rangle_settings_updated_v1");
        if (settings_updated_raw) {
            const parsed_updated = parseInt(settings_updated_raw, 10);
            if (!isNaN(parsed_updated)) {
                setLastUpdated(parsed_updated);
            }
        }
    }, []);

    const update_settings = (new_settings: Partial<Settings>, timestamp?: number) => {
        setSettings((prev) => ({ ...prev, ...new_settings }));

        const settings_raw = localStorage.getItem("rangle_settings_v1");
        const settings_to_save = settings_raw ? JSON.parse(settings_raw) : DEFAULT_SETTINGS;
        const updated_settings = { ...settings_to_save, ...new_settings };
        localStorage.setItem("rangle_settings_v1", JSON.stringify(updated_settings));

        const now = timestamp || Date.now();
        localStorage.setItem("rangle_settings_updated_v1", now.toString());
        setLastUpdated(now);
    };

    return (
        <SettingsContext.Provider value={{ settings, update_settings, last_updated }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const VirtualSettingsProvider = ({ children, initial_settings = DEFAULT_SETTINGS }: { children: React.ReactNode; initial_settings?: Partial<Settings> }) => {
    const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, ...initial_settings });
    const [last_updated, setLastUpdated] = useState<number | null>(null);

    const update_settings = (new_settings: Partial<Settings>, timestamp?: number) => {
        setSettings((prev) => ({ ...prev, ...new_settings }));
        setLastUpdated(timestamp || Date.now());
    };

    return (
        <SettingsContext.Provider value={{ settings, update_settings, last_updated }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};

export const useSettingValue = <K extends keyof Settings>(key: K) => {
    const { settings, update_settings } = useSettings();
    return [
        settings[key],
        (new_value: Settings[K]) => update_settings({ [key]: new_value }),
    ] as const;
};
