"use client";

import {createContext, useContext, useEffect, useState} from "react";

const DEFAULT_SETTINGS = {
    default_hardcore: false as boolean,
    theme: "default" as string,
} as const;

export type Settings = typeof DEFAULT_SETTINGS;

interface SettingsContextType {
    settings: Settings;
    update_settings: (new_settings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

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
    }, []);

    const update_settings = (new_settings: Partial<Settings>) => {
        setSettings((prev) => ({ ...prev, ...new_settings }));

        const settings_raw = localStorage.getItem("rangle_settings_v1");
        const settings_to_save = settings_raw ? JSON.parse(settings_raw) : DEFAULT_SETTINGS;
        const updated_settings = { ...settings_to_save, ...new_settings };
        localStorage.setItem("rangle_settings_v1", JSON.stringify(updated_settings));
    };

    return (
        <SettingsContext.Provider value={{ settings, update_settings }}>
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
