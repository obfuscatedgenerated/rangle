"use client";

import {DraggableStats} from "@/components/DraggableStats";
import {SharePopup} from "@/components/SharePopup";
import {Toast} from "@/components/Toast";
import {HardcoreToggle} from "@/components/HardcoreToggle";

import {useRangleState} from "@/hooks/useRangleState";
import {useWindowSize} from "@/hooks/useWindowSize";

import {epoch_utc, time_zone} from "../../time";

import {useState, useEffect, useCallback} from "react";

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

interface GameProps {
    archive_date?: string;
    on_loaded?: () => void;
}

export const Game = ({ archive_date, on_loaded }: GameProps) => {
    // if undefined, will load today's puzzle
    const [date_override, setDateOverride] = useState<string | undefined>(archive_date);

    const on_load_error = useCallback(
        (err: Error) => {
            // if the error is not found, try to go back a day
            if (err.message === "NO_PUZZLE") {
                const current_iso = date_override
                    ? date_override
                    : new Date().toLocaleDateString("en-CA", { timeZone: time_zone });

                const yesterday = new Date(`${current_iso}T00:00:00Z`);
                yesterday.setUTCDate(yesterday.getUTCDate() - 1);

                // if yesterday is before the epoch, stop trying
                if (yesterday < epoch_utc) {
                    alert("No puzzles available!");
                    return;
                }

                const yesterday_iso = yesterday.toISOString().split("T")[0];

                setDateOverride(yesterday_iso);
                console.log("No puzzle found for date, trying previous day:", yesterday_iso);
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
        set_current_order,
        hardcore,
        setHardcore
    } = useRangleState({
        on_loaded,
        on_load_error,
        date_override
    });

    const [just_attempted, setJustAttempted] = useState(false);

    const [reveal_values, setRevealValues] = useState(false);
    const [share_open, setShareOpen] = useState(false);

    const [toast_message, setToastMessage] = useState("");
    const [toast_visible, setToastVisible] = useState(false);

    const window_size = useWindowSize();

    const check_answer = useCallback(
        () => {
            if (!today_data) {
                return;
            }
            
            if (finished) {
                return;
            }

            // TODO: block duplicate guesses (need to add to rangle state)

            // trigger just attempted state for styling purposes
            setJustAttempted(true);
            setTimeout(() => {
                setJustAttempted(false);
            }, 1000);

            const {correct_positions: new_correct_positions} = submit_guess(current_order);

            if (hardcore) {
                // show number correct in toast
                const num_correct = new_correct_positions.filter((pos) => pos).length;

                let emoji = "❌";
                if (num_correct === 5) {
                    emoji = "🎉";
                } else if (num_correct >= 3) {
                    emoji = "🤏";
                } else if (num_correct >= 1) {
                    emoji = "🤔";
                }

                setToastMessage(`${emoji} ${num_correct}/5 correct`);
                setToastVisible(true);
                setTimeout(() => {
                    setToastVisible(false);
                }, 2000);
            }
        },
        // any point memoising?
        [today_data, finished, submit_guess, current_order, hardcore]
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
        return null;
    }

    return (
        <>
            <SharePopup hardcore={hardcore} archive_date={archive_date} open={share_open} on_close={() => setShareOpen(false)} attempts={attempts} today_data={today_data} />

            <div className="flex mb-4 sm:mb-6 items-center justify-center gap-8">
                <p className="text-sm sm:text-lg">#{today_data.number} | {today_data.difficulty} • Attempt: {finished ? attempts.length : attempts.length + 1}/5</p>
                <HardcoreToggle hardcore={hardcore} attempt_count={attempts.length} on_toggle={setHardcore} />
            </div>

            <div className="flex flex-col items-center gap-2">
                <div className="flex">
                    <DraggableStats
                        puzzle={current_order}
                        on_reorder={set_current_order}
                        correct_positions={(hardcore && !finished) ? [false, false, false, false, false] : correct_positions}
                        finished={finished}
                        reveal_values={reveal_values}
                        incorrect_className={!hardcore && just_attempted ? "bg-red-500 border-red-700 animate-shake-horizontal" : undefined}
                    />

                    <div className="flex flex-col items-center ml-4 sm:ml-6 opacity-33">
                        <span className="text-xs font-bold uppercase tracking-widest">
                            <span className="hidden sm:inline">Smallest</span>
                            <span className="inline sm:hidden">Min</span>
                        </span>
                        <div className="w-px flex-grow bg-gradient-to-b from-gray-300 via-gray-500 to-gray-300 my-2 relative">
                            <div className="absolute bottom-0 -left-[4px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-gray-500" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">
                            <span className="hidden sm:inline">Largest</span>
                            <span className="inline sm:hidden">Max</span>
                        </span>
                    </div>
                </div>

                <button disabled={finished} className="w-full text-lg font-bold uppercase tracking-wider mt-4 mb-2 sm:mt-6 sm:mb-4 px-4 py-3 bg-blue-500 text-white rounded cursor-pointer disabled:bg-gray-500 disabled:cursor-auto" onClick={check_answer}>
                    Check
                </button>
            </div>

            {finished_correctly && (
                <ReactConfetti style={{position: "fixed"}} width={window_size.width} height={window_size.height} />
            )}

            <Toast message={toast_message} visible={toast_visible} position="center" />
        </>
    );
}

// TODO: way to get back share popup
// TODO: archives
