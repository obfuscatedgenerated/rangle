"use client";

import {useState, useEffect, useCallback} from "react";
import {DraggableStats} from "@/components/DraggableStats";
import {SharePopup} from "@/components/SharePopup";

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
    const [today_data, setTodayData] = useState<TodayData | null>(null);
    const [answers, setAnswers] = useState<PuzzleStat[]>([]);

    const [current_order, setCurrentOrder] = useState<PuzzleStat[]>([]);
    const [correct_positions, setCorrectPositions] = useState<StatPositionFlags>([false, false, false, false, false]);

    const [just_attempted, setJustAttempted] = useState(false);

    const [attempts, setAttempts] = useState<StatPositionFlags[]>([]);
    const [finished, setFinished] = useState(false);
    const [share_open, setShareOpen] = useState(false);

    useEffect(() => {
        fetch("/daily/today.json", {
            cache: "no-store",
        }).then((res) => res.json()).then((data) => {
            setTodayData(data);
            setCurrentOrder(data.puzzle);

            // compute answers by sorting by value
            const sorted_puzzle = [...data.puzzle].sort((a, b) => a.value - b.value);
            setAnswers(sorted_puzzle);
        }).catch((err) => {
            console.error("Error fetching today's data:", err);
        });
    }, []);

    const check_answer = useCallback(
        () => {
            if (!today_data) {
                return;
            }
            
            if (finished) {
                return;
            }

            const new_correct_positions: [boolean, boolean, boolean, boolean, boolean] = [false, false, false, false, false];
            for (let i = 0; i < current_order.length; i++) {
                if (current_order[i].id === answers[i].id) {
                    new_correct_positions[i] = true;
                }
            }
            setCorrectPositions(new_correct_positions);

            // add attempt to history
            setAttempts((prev) => [...prev, new_correct_positions]);

            // trigger just attempted state for styling purposes
            setJustAttempted(true);
            setTimeout(() => {
                setJustAttempted(false);
            }, 1000);

            // if everything is correct, fire the finish logic
            if (new_correct_positions.every((pos) => pos)) {
                setFinished(true);
                setShareOpen(true);
                return;
            }

            // if reached attempt limit, reveal the answer
            // TODO: animate this differently to show it rearranging, then display the share popup after
            if (attempts.length + 1 >= 5) {
                setCurrentOrder(answers);
                setFinished(true);
                setShareOpen(true);
                return;
            }
        },
        // any point memoising?
        [today_data, finished, attempts.length, current_order, answers]
    );

    const on_reorder = useCallback(
        (new_order: PuzzleStat[]) => {
            setCurrentOrder(new_order);
        },
        []
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

            <p className="mb-4 sm:mb-8 text-sm sm:text-lg">#{today_data.number} | {today_data.difficulty} • {attempts.length}/5</p>

            <DraggableStats
                puzzle={current_order}
                on_reorder={on_reorder}
                correct_positions={correct_positions}
                finished={finished}
                incorrect_className={just_attempted ? "bg-red-500 border-red-700 animate-shake-horizontal" : undefined}
            />

            <button disabled={finished} className="my-4 sm:my-6 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer disabled:bg-gray-500" onClick={check_answer}>
                Check
            </button>
        </>
    );
}
