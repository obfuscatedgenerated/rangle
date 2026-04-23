"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {StatPositionFlags, TodayData} from "@/components/Game";
import {PuzzleCountdown} from "@/components/PuzzleCountdown";

import Link from "next/link";
import {useSettingValue} from "@/context/SettingsContext";
import {THEMES} from "@/themes";
import {useAuth} from "@/context/AuthContext";
import {in_discord_activity} from "@/util/discord";
import {LeaderboardPopup} from "@/components/LeaderboardPopup";

interface SharePopupProps {
    open: boolean;
    on_close: () => void;
    attempts: StatPositionFlags[];
    today_data: TodayData;
    archive_date?: string;
    hardcore?: boolean;
    bonus_results: Record<string, boolean>;
}

const is_mobile = () => {
    if (typeof window === "undefined") {
        return undefined;
    }

    return /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export const SharePopup = ({open, on_close, attempts, today_data, archive_date, hardcore, bonus_results}: SharePopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);
    const [share_button_text, setShareButtonText] = useState("Share Results");

    const [manual_share_mode, setManualShareMode] = useState(false);

    const got_it_right = useMemo(() => attempts[attempts.length - 1]?.every((pos) => pos), [attempts]);

    const [theme_id] = useSettingValue("theme");

    const theme_share_emoji = useMemo(() => {
        const theme_data = THEMES[theme_id] || THEMES["default"];
        return theme_data.share_emoji || THEMES["default"].share_emoji;
    }, [theme_id]);

    // sync with open prop
    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
            setManualShareMode(false);
        }
    }, [open]);

    const {via_discord_activity} = useAuth();

    // on window load, update button text
    useEffect(() => {
        if (via_discord_activity || is_mobile()) {
            setShareButtonText("Share Results");
        } else {
            setShareButtonText("Copy Results");
        }
    }, [via_discord_activity]);

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
    
    const total_bonus_rounds = useMemo(
        () => Object.keys(bonus_results).length,
        [bonus_results]
    );

    const successful_bonus_rounds = useMemo(
        () => Object.values(bonus_results).filter((result) => result).length,
        [bonus_results]
    );
    
    const share_url = useMemo(
        () => {
            let base_url = window.location.origin;

            if (in_discord_activity()) {
                base_url = "https://rangle.today";
            }

            if (archive_date) {
                return `${base_url}/?d=${archive_date}`;
            } else {
                return base_url;
            }
        },
        [archive_date]
    );
    
    const share_text = useMemo(
        () => {
            if (!today_data) {
                return "";
            }
            
            let share_text = `Rangle #${today_data.number}${archive_date ? ` (archived from ${archive_date})` : ""} | ${today_data.difficulty} • ${got_it_right ? attempts.length : "X"}/5`;

            if (hardcore) {
                share_text += "\n💪 HARDCORE mode!"
            }
            
            share_text += "\n\n";

            share_text += attempts.map(
                (attempt) =>
                    attempt.map(
                        (pos) => pos ? theme_share_emoji.correct : theme_share_emoji.incorrect).join(" ")
            ).join("\n");
            
            if (total_bonus_rounds > 0) {
                share_text += `\n\nBonus round${total_bonus_rounds === 1 ? "" : "s"}: ${successful_bonus_rounds} ${theme_share_emoji.correct} out of ${total_bonus_rounds}`;
            }

            share_text += `\n\n${share_url}`;
            
            return share_text;
        },
        [today_data, archive_date, got_it_right, attempts, hardcore, total_bonus_rounds, share_url, theme_share_emoji.correct, theme_share_emoji.incorrect, successful_bonus_rounds]
    );

    const on_share = useCallback(
        async () => {
            // if in discord, have to present it as text to manually copy lol!
            // TODO: maybe add a bot like wordle?
            if (via_discord_activity) {
                // TODO: might be able to select all
                setManualShareMode(true);
                return;
            }

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
        [via_discord_activity, share_text, today_data.number, handle_copy]
    );

    const [leaderboard_open, setLeaderboardOpen] = useState(false);

    // TODO: base dialog component
    return (
        <>
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

            {total_bonus_rounds > 0 && (
                <p className="mt-2 text-center">
                    You got {successful_bonus_rounds} out of {total_bonus_rounds} bonus round{total_bonus_rounds === 1 ? "" : "s"} correct!
                </p>
            )}

            <PuzzleCountdown />

            {via_discord_activity && (
                <span className="underline cursor-pointer" onClick={() => setLeaderboardOpen(true)}>View Server Leaderboard</span>
            )}

            {manual_share_mode && (
                <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-center">Copy the text below!</p>
                    <textarea readOnly className="w-full h-32 p-2 bg-secondary text-on-secondary rounded" value={share_text}></textarea>
                </div>
            )}

            <div className="mt-4 flex gap-4">
                <button
                    className="px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                    onClick={() => dialog_ref.current?.close()}
                >
                    Close
                </button>

                {!manual_share_mode && (
                    <button
                        className="px-4 py-2 bg-primary text-on-primary rounded cursor-pointer"
                        onClick={on_share}
                    >
                        {share_button_text}
                    </button>
                )}
            </div>

            <p className="mt-4">Eager for more? Visit <Link className="underline" href="/archive">the archive</Link> to play previous Rangles.</p>
        </dialog>
            {/*TODO: prob shouldnt be a child here, and should be accesible lesewhere. but just a test for now*/}
            <LeaderboardPopup open={leaderboard_open} on_close={() => setLeaderboardOpen(false)} today_data={today_data} />
        </>
    );
}

// TODO: move button to component

