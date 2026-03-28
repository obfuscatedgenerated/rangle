"use client";

import {useState, useEffect, useCallback} from "react";
import {DraggableStats} from "@/components/DraggableStats";

interface TodayData {
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
}

export const Game = () => {
    const [today_data, setTodayData] = useState<TodayData | null>(null);
    const [answers, setAnswers] = useState<PuzzleStat[]>([]);

    const [current_order, setCurrentOrder] = useState<PuzzleStat[]>([]);
    const [correct_positions, setCorrectPositions] = useState<[boolean, boolean, boolean, boolean, boolean]>([false, false, false, false, false]);

    const [attempts, setAttempts] = useState(0);
    const [finished, setFinished] = useState(false);

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

            setAttempts(attempts + 1);

            const new_correct_positions: [boolean, boolean, boolean, boolean, boolean] = [false, false, false, false, false];
            for (let i = 0; i < current_order.length; i++) {
                if (current_order[i].id === answers[i].id) {
                    new_correct_positions[i] = true;
                }
            }
            setCorrectPositions(new_correct_positions);

            // if everything is correct, fire the finish logic
            if (new_correct_positions.every((pos) => pos)) {
                setFinished(true);
            }

            // if reached attempt limit, reveal the answer
            if (attempts + 1 >= 6) {
                setCurrentOrder(answers);
                setFinished(true);
            }
        },
        // any point memoising?
        [answers, current_order, today_data, attempts]
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
            <p>#{today_data.number} | {today_data.difficulty}</p>
            <DraggableStats puzzle={current_order} on_reorder={on_reorder} correct_positions={correct_positions} reveal_values={finished} />

            <button className="my-4 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer" onClick={check_answer}>
                Check
            </button>
        </>
    );
}
