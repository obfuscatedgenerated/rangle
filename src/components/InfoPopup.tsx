"use client";

import {useEffect, useRef, useState} from "react";

interface InfoPopupProps {
    open: boolean;
    on_close: () => void;
}

export const InfoPopup = ({open, on_close}: InfoPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    const [pronunciation, setPronunciation] = useState("wrangle");

    useEffect(() => {
        // if pronunciation not in localstorage, randomly choose between "wrangle" and "range-le" and save to localstorage :)))
        if (!localStorage.getItem("gaslight")) {
            const options = ["wrangle", "range-le"];
            const choice = options[Math.floor(Math.random() * options.length)];
            localStorage.setItem("gaslight", choice);
        }

        setPronunciation(localStorage.getItem("gaslight")!);
    }, []);

    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    return (
        <dialog onAbort={on_close} ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="font-title text-xl font-bold">Rangle</h2>
            <p className="font-title mb-4 opacity-60">(pronounced &quot;{pronunciation}&quot;)</p>

            <p>
                Rangle is a game about sorting. Each day, you are given a list of 5 stats, and your goal is to find the correct order of the stat values.
            </p>

            <br />

            <p>
                You have 5 attempts to guess the correct order. Stats marked green are correct and will be locked in place.
            </p>

            <br />

            <div className="flex gap-2">
                <a href="https://github.com/obfuscatedgenerated/rangle" target="_blank" rel="noreferrer noopener" className="underline">
                    Source code
                </a>

                •

                <a href="https://github.com/obfuscatedgenerated/rangle/issues/new" target="_blank" rel="noreferrer noopener" className="underline">
                    Report a bug
                </a>
            </div>

            <br />

            <button
                className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer"
                onClick={on_close}
            >
                Close
            </button>
        </dialog>
    );
}
