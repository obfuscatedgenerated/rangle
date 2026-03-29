"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import type {StatPositionFlags, TodayData} from "@/components/Game";

interface SharePopupProps {
    open: boolean;
    on_close: () => void;
    attempts: StatPositionFlags[];
    today_data: TodayData;
}

const is_mobile = () => {
    if (typeof window === "undefined") {
        return undefined;
    }

    return /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export const SharePopup = ({open, on_close, attempts, today_data}: SharePopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);
    const [share_button_text, setShareButtonText] = useState("Share Results");

    const got_it_right = attempts[attempts.length - 1]?.every((pos) => pos);

    // sync with open prop
    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    // on window load, update button text
    useEffect(() => {
        setShareButtonText(is_mobile() ? "Share Results" : "Copy Results");
    }, []);

    const handle_copy = useCallback(
        (share_text: string) => {
            navigator.clipboard.writeText(share_text).then(() => {
                setShareButtonText("Copied!");

                setTimeout(() => {
                    setShareButtonText(is_mobile() ? "Share Results" : "Copy Results");
                }, 2000);
            }).catch((err) => {
                console.error("Error copying to clipboard:", err);
                alert("Failed to copy to clipboard!");
            });
        },
        []
    );

    const on_share = useCallback(
        () => {
            if (!today_data) {
                return;
            }

            const share_text = `Rangle #${today_data.number} | ${today_data.difficulty} • ${got_it_right ? attempts.length : "X"}/5\n\n` +
                attempts.map((attempt) => attempt.map((pos) => pos ? "🟩" : "⬛").join(" ")).join("\n") +
                `\n\n${window.location.href}`;

            // if on mobile, open share dialog if available, otherwise fallback to copying to clipboard
            // even if share dialog available on desktop, it usually sucks so copy it
            if (is_mobile() && navigator.share) {
                navigator.share({
                    title: `Rangle #${today_data.number}`,
                    text: share_text,
                    url: window.location.href,
                }).catch((err) => {
                    console.error("Error sharing:", err);
                    handle_copy(share_text);
                });
            } else {
                handle_copy(share_text);
            }
        },
        [attempts, got_it_right, today_data, handle_copy]
    );

    return (
        <dialog onAbort={on_close} ref={dialog_ref}
                className="rounded-lg p-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Results</h2>
            <p className="mb-4 opacity-60">#{today_data.number} | {today_data.difficulty}</p>

            <div className="flex flex-col items-center justify-center gap-1">
                {attempts.map((attempt, idx) => (
                    <div key={idx} className="flex gap-1">
                        {attempt.map((pos, pos_idx) => (
                            <div key={pos_idx}
                                 className={`w-4 h-4 rounded ${pos ? "bg-green-600" : "bg-gray-700"}`}></div>
                        ))}
                    </div>
                ))}
            </div>

            {got_it_right ? (
                <p className="mt-4 text-green-600 font-bold">Great job! You solved today&apos;s Rangle
                    in {attempts.length} attempts.</p>
            ) : (
                <p className="mt-4 text-red-600 font-bold">Better luck next time!</p>
            )}

            <div className="mt-4 flex gap-4">
                <button
                    className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer"
                    onClick={() => dialog_ref.current?.close()}
                >
                    Close
                </button>

                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer"
                    onClick={on_share}
                >
                    {share_button_text}
                </button>
            </div>
        </dialog>
    );
}

// TODO: move button to component

