"use client";

import {useEffect, useRef} from "react";

export const InfoPopup = () => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        // when ready, show the dialog if not shown before
        if (localStorage.getItem("info_popup_shown") === "true") {
            return;
        }

        localStorage.setItem("info_popup_shown", "true");
        dialog_ref.current?.showModal();
    }, []);

    return (
        <dialog ref={dialog_ref} className="rounded-lg p-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="font-title text-xl font-bold">Rangle</h2>
            <p className="font-title mb-4 opacity-60">(pronounced &quot;wrangle&quot;)</p>

            <p>
                Rangle is a game about sorting. Each day, you are given a list of 5 stats, and your goal is to find the correct order of the stat values.
            </p>

            <br />

            <p>
                You have 5 attempts to guess the correct order. Stats marked green are correct and will be locked in place.
            </p>

            <br />

            <button
                className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer"
                onClick={() => dialog_ref.current?.close()}
            >
                Close
            </button>
        </dialog>
    );
}
