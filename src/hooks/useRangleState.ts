import {PuzzleStat, StatPositionFlags, TodayData} from "@/components/Game";
import {useCallback, useEffect, useMemo, useState} from "react";

export const useRangleState = () => {
    const [today_data, setTodayData] = useState<TodayData | null>(null);

    const [current_order, setCurrentOrder] = useState<PuzzleStat[]>([]);
    const [correct_positions, setCorrectPositions] = useState<StatPositionFlags>([false, false, false, false, false]);

    const [attempts, setAttempts] = useState<StatPositionFlags[]>([]);

    const [finished, setFinished] = useState(false);

    // fetch today's data on load, as well as local save state if today's exists
    useEffect(() => {
        fetch("/daily/today.json", {
            cache: "no-store",
        }).then((res) => res.json()).then((data) => {
            setTodayData(data);

            const saved_state = localStorage.getItem("rangle_state_v1");
            if (saved_state) {
                const parsed_state = JSON.parse(saved_state);
                const today_save = parsed_state?.[data.date];
                if (today_save) {
                    setCurrentOrder(today_save.current_order);
                    setCorrectPositions(today_save.correct_positions);
                    setAttempts(today_save.attempts);
                    setFinished(today_save.finished);
                } else {
                    setCurrentOrder(data.puzzle);
                }
            } else {
                setCurrentOrder(data.puzzle);
            }
        }).catch((err) => {
            console.error("Error fetching today's data:", err);
        });
    }, []);

    // memoise sorted answers
    const answers = useMemo(
        () => today_data ? [...today_data.puzzle].sort((a, b) => a.value - b.value) : [],
        [today_data]
    );

    // returns if the guess was correct and if the game is finished, and updates state accordingly
    const submit_guess = useCallback(
        (guess: PuzzleStat[]) => {
            if (!today_data) {
                throw new Error("Today's data not loaded yet");
            }

            const new_correct_positions: StatPositionFlags = [false, false, false, false, false];
            for (let i = 0; i < guess.length; i++) {
                if (guess[i].id === answers[i].id) {
                    new_correct_positions[i] = true;
                }
            }
            setCorrectPositions(new_correct_positions);

            // add attempt to history
            setAttempts((prev) => [...prev, new_correct_positions]);

            // save state to local storage
            const save_state = {
                current_order: guess,
                correct_positions: new_correct_positions,
                attempts: [...attempts, new_correct_positions],
                finished: new_correct_positions.every((pos) => pos) || attempts.length + 1 >= 5,
            };

            const existing_saves = localStorage.getItem("rangle_state_v1");
            const parsed_saves = existing_saves ? JSON.parse(existing_saves) : {};
            parsed_saves[today_data.date] = save_state;
            localStorage.setItem("rangle_state_v1", JSON.stringify(parsed_saves));
            
            if (new_correct_positions.every((pos) => pos)) {
                setFinished(true);
                return {
                    correct: true,
                    finished: true,
                }
            } else if (attempts.length + 1 >= 5) {
                setFinished(true);
                return {
                    correct: false,
                    finished: true,
                }
            } else {
                return {
                    correct: false,
                    finished: false,
                }
            }
        },
        [answers, attempts, today_data]
    );

    const reveal_answers = useCallback(
        () => {
            setCurrentOrder(answers);
        },
        [answers]
    );
    
    return {
        today_data,
        current_order,
        set_current_order: setCurrentOrder,
        correct_positions,
        attempts,
        finished,
        submit_guess,
        reveal_answers,
    };
}
