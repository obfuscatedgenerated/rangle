"use client";

import {useEffect, useRef} from "react";

interface SettingsPopupProps {
    open: boolean;
    on_close: () => void;
}

export const SettingsPopup = ({open, on_close}: SettingsPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    // sync with open prop
    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    // TODO: base dialog component
    return (
        <dialog onAbort={on_close} ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Settings</h2>
            <p className="mb-4 opacity-60">Not yet implemented :P</p>

            <button
                className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer"
                onClick={on_close}
            >
                Close
            </button>
        </dialog>
    );
}

// TODO: close when clicking outside (this is why a base component would be nice)
