"use client";

import changelog from "@/generated_changelog.json";

import {useEffect, useRef, useState} from "react";

const ChangelogPopup = ({ open, on_close }: { open: boolean, on_close: () => void }) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    // TODO: really need that base component! stop being lazy!
    // TODO: prettier display with scrolling and maybe lazy rendering, and better close button positioning
    return (
        <dialog onAbort={on_close} ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4">Changelog</h2>
            {changelog.entries.map((entry, idx) => (
                <div key={idx} className="mb-4 w-full">
                    <h3 className="font-bold tracking-widest opacity-60">{entry.date}</h3>
                    <p className="ml-2 mt-2 text-pretty" dangerouslySetInnerHTML={{ __html: entry.content }}></p>
                </div>
            ))}

            <button
                className="px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                onClick={on_close}
            >
                Close
            </button>
        </dialog>
    );
}

export const ChangelogWidget = () => {
    const [show_changelog, setShowChangelog] = useState(false);

    return (
        <>
            <div className="w-full mb-4">
                <button
                    className="mx-auto group text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center gap-1 cursor-pointer"
                    title="Click to open changelog"
                    onClick={() => setShowChangelog(true)}
                >
                    <span className="bg-primary opacity-80 dark:opacity-60 group-hover:opacity-100 group-hover:dark:opacity-90 transition-opacity text-on-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">NEW</span>
                    {changelog.latest} <span className="underline">View Changelog</span>
                </button>
            </div>

            <ChangelogPopup open={show_changelog} on_close={() => setShowChangelog(false)} />
        </>
    );
}
