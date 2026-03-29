"use client";

import {useState, useEffect, useCallback} from "react";
import {DraggableStats} from "@/components/DraggableStats";
import {SharePopup} from "@/components/SharePopup";
import {useRangleState} from "@/hooks/useRangleState";
import ReactConfetti from "react-confetti";

export interface TodayData {
    date: string;
    number: number;
    difficulty: string;
    neighbourhood: string;
    puzzle: PuzzleStat[];
}

export interface PuzzleStat {
    id: string;
    name: string;
    value: number;
    metric: string;
    description: string;
    prefix: string;
    suffix: string;
    unit_hint: string;
}

export type StatPositionFlags = [boolean, boolean, boolean, boolean, boolean];

export const Game = () => {
    const [date_override, setDateOverride] = useState<string | undefined>(undefined);

    const on_load_error = useCallback(
        (err: Error) => {
            // if the error is not found, try to go back a day
            if (err.message === "NO_PUZZLE") {
                const yesterday = date_override ? new Date(date_override) : new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setDateOverride(yesterday.toISOString().split("T")[0]);

                console.log("No puzzle found for date, trying previous day:", yesterday.toISOString().split("T")[0]);
            } else {
                alert("Error loading puzzle: " + err.message);
            }
        },
        [date_override]
    );

    const {
        today_data,
        attempts,
        current_order,
        finished,
        finished_correctly,
        correct_positions,
        reveal_answers,
        submit_guess,
        set_current_order
    } = useRangleState({
        on_load_error,
        date_override
    });

    const [just_attempted, setJustAttempted] = useState(false);

    const [reveal_values, setRevealValues] = useState(false);
    const [share_open, setShareOpen] = useState(false);

    const check_answer = useCallback(
        () => {
            if (!today_data) {
                return;
            }
            
            if (finished) {
                return;
            }

            // trigger just attempted state for styling purposes
            setJustAttempted(true);
            setTimeout(() => {
                setJustAttempted(false);
            }, 1000);

            submit_guess(current_order);
        },
        // any point memoising?
        [current_order, submit_guess, today_data, finished]
    );

    // trigger end game logic when game finishes (as it could be triggered by either submit_guess or loading saved state on mount)
    useEffect(() => {
        if (!finished) {
            return;
        }
        
        // game finished, trigger end game logic
        if (finished_correctly) {
            // if everything is correct, fire the finish logic
            setRevealValues(true);

            // open share popup after a delay
            setTimeout(() => {
                setShareOpen(true);
            }, 1500);
        } else {
            // if reached attempt limit, reveal the answer
            // reveal the values after a delay
            setTimeout(() => {
                setRevealValues(true);
            }, 1000);

            // reveal the order after a slightly longer delay
            setTimeout(() => {
                reveal_answers();
            }, 2000);

            // open share popup after a longer delay
            setTimeout(() => {
                setShareOpen(true);
            }, 3000);
        }
    }, [finished, finished_correctly, reveal_answers]);

    if (!today_data) {
        return (
            <div className="flex flex-col items-center justify-center gap-4">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <>
            <SharePopup open={share_open} on_close={() => setShareOpen(false)} attempts={attempts} today_data={today_data} />

            <p className="mb-4 sm:mb-8 text-sm sm:text-lg">#{today_data.number} | {today_data.difficulty} • Attempt: {finished ? attempts.length : attempts.length + 1}/5</p>

            <DraggableStats
                puzzle={current_order}
                on_reorder={set_current_order}
                correct_positions={correct_positions}
                finished={finished}
                reveal_values={reveal_values}
                incorrect_className={just_attempted ? "bg-red-500 border-red-700 animate-shake-horizontal" : undefined}
            />

            <button disabled={finished} className="my-4 sm:my-6 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer disabled:bg-gray-500 disabled:cursor-auto" onClick={check_answer}>
                Check
            </button>

            {finished_correctly && (
                <ReactConfetti />
            )}
        </>
    );
}

// TODO: way to get back info and share popup
// TODO: archives
