"use client";

import {useState, useEffect, useCallback} from "react";
import {DraggableStats} from "@/components/DraggableStats";
import {SharePopup} from "@/components/SharePopup";
import {useRangleState} from "@/hooks/useRangleState";

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
    const {
        today_data,
        attempts,
        current_order,
        finished,
        correct_positions,
        reveal_answers,
        submit_guess,
        set_current_order
    } = useRangleState();

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

            const guess_result = submit_guess(current_order);

            // trigger just attempted state for styling purposes
            setJustAttempted(true);
            setTimeout(() => {
                setJustAttempted(false);
            }, 1000);
            
            if (!guess_result.finished) {
                return;
            }
            
            // game finished, trigger end game logic
            if (guess_result.correct) {
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
        },
        // any point memoising?
        [today_data, current_order, submit_guess, reveal_answers, finished]
    );

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
        </>
    );
}

// TODO: way to get back info and share popup
// TODO: archives
