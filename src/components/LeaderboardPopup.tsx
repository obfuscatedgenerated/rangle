"use client";

import {useEffect, useMemo, useRef, useState} from "react";

import {useAuth} from "@/context/AuthContext";
import {LeaderboardEntry, useDiscordLeaderboard} from "@/context/DiscordLeaderboardContext";

import type {TodayData} from "@/components/Game";
import {LoadingSpinner} from "@/components/LoadingSpinner";

interface LeaderboardPopupProps {
    open: boolean;
    on_close: () => void;
    today_data: TodayData;
}

const LeaderboardContent = ({leaderboard, today_data}: {leaderboard: LeaderboardEntry[]; today_data: TodayData}) => {
    const has_bonus = useMemo(() => {
        return today_data.puzzle.some(entry => entry.bonus_round);
    }, [today_data.puzzle]);

    return (
        <>
            <p className="mb-4 opacity-60">#{today_data.number} | {today_data.difficulty}</p>

            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-divider">
                        <th className="p-2">Rank</th>
                        <th className="p-2">Player</th>
                        <th className="p-2">Attempts</th>
                        <th className="p-2">Hardcore?</th>
                        {has_bonus && <th className="py-2">Bonus correct</th>}
                    </tr>
                </thead>
                <tbody>
                    {leaderboard.map((entry, index) => (
                        <tr key={entry.user_id} className="border-b border-divider">
                            <td className="py-2">{index + 1}</td>
                            <td className="py-2"><img src={entry.avatar_url} className="w-6 h-6 rounded-full inline mr-2" draggable="false" /> {entry.username || <i>{entry.user_id}</i>}</td>
                            <td className="py-2">{entry.n_attempts}</td>
                            <td className="py-2">{entry.hardcore ? "💪" : ""}</td>
                            {has_bonus && <td className="py-2">{entry.n_correct_bonus}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

export const LeaderboardPopup = ({open, on_close, today_data}: LeaderboardPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    // sync with open prop
    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    const {via_discord_activity} = useAuth();
    const {get_leaderboard} = useDiscordLeaderboard();

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);

    // try to silently load the leaderboard on open
    useEffect(() => {
        if (!open || !via_discord_activity) {
            return;
        }

        setLeaderboard(null);
        get_leaderboard(today_data.date).then(lb => {
            if (lb) {
                setLeaderboard(lb);
            }
        });
    }, [open, today_data.date, get_leaderboard, via_discord_activity]);

    if (!via_discord_activity) {
        return null;
    }

    // TODO: base dialog component
    return (
        <dialog onAbort={on_close} ref={dialog_ref}
                className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Leaderboard</h2>

            {leaderboard ? (
                <LeaderboardContent leaderboard={leaderboard} today_data={today_data} />
            ) : (
                <LoadingSpinner />
            )}

            <button
                className="mt-2 px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                onClick={on_close}
            >
                Close
            </button>
        </dialog>
    );
}
