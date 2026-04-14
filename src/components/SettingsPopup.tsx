"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {ToggleSwitch} from "@/components/ToggleSwitch";

import {useSettings} from "@/context/SettingsContext";
import {ThemeChooser} from "@/components/ThemeChooser";
import {useRangleScores} from "@/context/RangleScoresContext";

interface SettingsPopupProps {
    open: boolean;
    on_close: () => void;
}

export const SettingsPopup = ({open, on_close}: SettingsPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    const { settings, update_settings } = useSettings();

    // sync with open prop
    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    const [rebuild_button_text, setRebuildButtonText] = useState("Rebuild score file");

    const { rebuild_scores } = useRangleScores();
    const handle_rebuild_scores = useCallback(
        () => {
            rebuild_scores();
            setRebuildButtonText("Score file rebuilt!");
            setTimeout(() => setRebuildButtonText("Rebuild score file"), 2000);
        },
        [rebuild_scores]
    );

    // TODO: base dialog component
    return (
        <dialog onAbort={on_close} ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Settings</h2>

            <div className="flex flex-col items-center justify-center gap-6 my-4">
                <ToggleSwitch value={settings.default_hardcore} on_toggle={(new_value) => update_settings({ default_hardcore: new_value })}>
                    Default to hardcore mode
                </ToggleSwitch>

                <label className="flex flex-col items-start gap-2 w-full max-w-xs">
                    Theme
                    <ThemeChooser />
                </label>

                <ToggleSwitch value={settings.sound} on_toggle={(new_value) => update_settings({ sound: new_value })}>
                    Sound effects
                </ToggleSwitch>

                <button className="px-4 py-2 mx-auto bg-primary text-on-primary rounded cursor-pointer" onClick={handle_rebuild_scores}>
                    {rebuild_button_text}
                </button>
            </div>

            <button
                className="mt-2 px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                onClick={on_close}
            >
                Close
            </button>
        </dialog>
    );
}

// TODO: close when clicking outside (this is why a base component would be nice)
