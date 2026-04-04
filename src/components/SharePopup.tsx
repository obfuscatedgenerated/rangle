"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {StatPositionFlags, TodayData} from "@/components/Game";
import {PuzzleCountdown} from "@/components/PuzzleCountdown";

import Link from "next/link";

interface SharePopupProps {
    open: boolean;
    on_close: () => void;
    attempts: StatPositionFlags[];
    today_data: TodayData;
    archive_date?: string;
    hardcore?: boolean;
}

const is_mobile = () => {
    if (typeof window === "undefined") {
        return undefined;
    }

    return /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export const SharePopup = ({open, on_close, attempts, today_data, archive_date, hardcore}: SharePopupProps) => {
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
    
    const share_url = useMemo(
        () => {
            const base_url = window.location.origin;
            if (archive_date) {
                return `${base_url}/?d=${archive_date}`;
            } else {
                return base_url;
            }
        },
        [archive_date]
    );

    const on_share = useCallback(
        () => {
            if (!today_data) {
                return;
            }

            const share_text = `Rangle #${today_data.number}${archive_date ? ` (archived from ${archive_date})` : ""} | ${today_data.difficulty} • ${got_it_right ? attempts.length : "X"}/5\n${hardcore ? "💪 HARDCORE mode!\n" : ""}\n` +
                attempts.map((attempt) => attempt.map((pos) => pos ? "🟩" : "⬛").join(" ")).join("\n") +
                `\n\n${share_url}`;

            // if on mobile, open share dialog if available, otherwise fallback to copying to clipboard
            // even if share dialog available on desktop, it usually sucks so copy it
            if (is_mobile() && navigator.share) {
                navigator.share({
                    title: `Rangle #${today_data.number}`,
                    text: share_text
                }).catch((err) => {
                    // if just cancelled, don't show error
                    if (err.name === "AbortError") {
                        return;
                    }
                    
                    console.error("Error sharing:", err);
                    handle_copy(share_text);
                });
            } else {
                handle_copy(share_text);
            }
        },
        [today_data, archive_date, got_it_right, attempts, hardcore, share_url, handle_copy]
    );

    // TODO: base dialog component
    return (
        <dialog onAbort={on_close} ref={dialog_ref}
                className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Results</h2>
            <p className="mb-4 opacity-60">#{today_data.number} | {today_data.difficulty}</p>

            <div className="flex flex-col items-center justify-center gap-1">
                {attempts.map((attempt, idx) => (
                    <div key={idx} className="flex gap-1">
                        {attempt.map((pos, pos_idx) => (
                            <div key={pos_idx}
                                 className={`w-4 h-4 rounded ${pos ? "bg-correct" : "bg-tertiary-background"}`}></div>
                        ))}
                    </div>
                ))}
            </div>

            {got_it_right ? (
                <p className="mt-4 text-correct-variant font-bold text-pretty text-center">Great job! You solved today&apos;s Rangle
                    in {attempts.length} attempt{attempts.length === 1 ? "" : "s"}.</p>
            ) : (
                <p className="mt-4 text-incorrect-variant font-bold text-pretty text-center">Better luck next time!</p>
            )}

            <PuzzleCountdown />

            <div className="mt-4 flex gap-4">
                <button
                    className="px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                    onClick={() => dialog_ref.current?.close()}
                >
                    Close
                </button>

                <button
                    className="px-4 py-2 bg-primary text-on-primary rounded cursor-pointer"
                    onClick={on_share}
                >
                    {share_button_text}
                </button>
            </div>

            <p className="mt-4">Eager for more? Visit <Link className="underline" href="/archive">the archive</Link> to play previous Rangles.</p>
        </dialog>
    );
}

// TODO: move button to component

