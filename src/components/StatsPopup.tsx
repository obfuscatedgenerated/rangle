"use client";

import {useEffect, useRef} from "react";
import {useRangleScores} from "@/hooks/useRangleScores";
import {LoadingSpinner} from "@/components/LoadingSpinner";

interface StatsPopupProps {
    open: boolean;
    on_close: () => void;
}

const title_case = (str: string) => {
    return str.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export const StatsPopup = ({open, on_close}: StatsPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    const {stats} = useRangleScores();

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
            <h2 className="text-xl font-bold mb-2">Statistics</h2>
            <p className="mb-4 opacity-60">WIP</p>

            {stats === null ? <LoadingSpinner /> :
                <table className="mb-6">
                    <thead>
                        <tr>
                            <th className="px-4 py-2">Stat</th>
                            <th className="px-4 py-2">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(stats).map(([key, value]) => (
                            <tr key={key}>
                                <td className="border px-4 py-2">{title_case(key)}</td>
                                <td className="border px-4 py-2">{typeof value === "object" ? JSON.stringify(value) : value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            }

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
