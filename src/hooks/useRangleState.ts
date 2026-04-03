import {time_zone} from "../../time";

import {PuzzleStat, StatPositionFlags, TodayData} from "@/components/Game";
import {useRangleScores} from "@/context/RangleScoresContext";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useSettingValue} from "@/context/SettingsContext";

interface RangleStateHookProps {
    on_loaded?: () => void;
    on_load_error?: (err: Error) => void;
    date_override?: string;
}

export interface SaveStateDay {
    current_order_ids: string[];
    attempts: StatPositionFlags[];
    hardcore?: boolean;
}

export type SaveState = Record<string, SaveStateDay>;

export const useRangleState = ({ on_loaded, on_load_error, date_override }: RangleStateHookProps = {}) => {
    const [today_data, setTodayData] = useState<TodayData | null>(null);

    const [current_order, setCurrentOrder] = useState<PuzzleStat[]>([]);
    const [correct_positions, setCorrectPositions] = useState<StatPositionFlags>([false, false, false, false, false]);

    const [attempts, setAttempts] = useState<StatPositionFlags[]>([]);

    const [finished, setFinished] = useState(false);
    const [finished_correctly, setFinishedCorrectly] = useState(false);

    const [default_hardcore] = useSettingValue("default_hardcore");
    const [hardcore, setHardcore] = useState(default_hardcore);
    
    const {update_score} = useRangleScores();

    // sync hardcore setting with default from settings context if no attempts have been made yet
    useEffect(() => {
        if (attempts.length === 0) {
            setHardcore(default_hardcore);
        }
    }, [default_hardcore, attempts.length]);

    // fetch today's data on load, as well as local save state if today's exists
    useEffect(() => {
        const today_date_iso = date_override
            ? date_override
            : new Date().toLocaleDateString("en-CA", { timeZone: time_zone });

        fetch(`/daily/${today_date_iso}.json`)
            .then((res) => {
                if (!res.ok) {
                    const err_msg = res.status === 404 ? "NO_PUZZLE" : res.statusText;
                    console.error("Error fetching today's data:", err_msg);
                    if (on_load_error) {
                        on_load_error(new Error(err_msg));
                    }
                }
                return res.json();
            })
            .then((data) => {
                setTodayData(data);

                const saved_state = localStorage.getItem("rangle_state_v1");
                if (saved_state) {
                    const parsed_state = JSON.parse(saved_state);
                    const today_save = parsed_state?.[data.date];
                    if (today_save) {
                        // resolve ids to full order object
                        // TODO: should current order just store ids in general?
                        const id_to_stat: Record<string, PuzzleStat> = {};
                        data.puzzle.forEach((stat: PuzzleStat) => {
                            id_to_stat[stat.id] = stat;
                        });

                        if (today_save.hardcore === true) {
                            setHardcore(true);
                        } else if (today_save.hardcore === false) {
                            setHardcore(false);
                        }

                        const saved_order = today_save.current_order_ids.map((id: string) => id_to_stat[id]);
                        setCurrentOrder(saved_order);

                        // evaluate correct positions for saved order
                        const answers = [...data.puzzle].sort((a, b) => a.value - b.value);
                        const saved_correct_positions: StatPositionFlags = [false, false, false, false, false];
                        for (let i = 0; i < saved_order.length; i++) {
                            if (saved_order[i].id === answers[i].id) {
                                saved_correct_positions[i] = true;
                            }
                        }
                        setCorrectPositions(saved_correct_positions);

                        setAttempts(today_save.attempts);

                        // evaluate if finished based on saved state
                        const is_correct = saved_correct_positions.every((pos) => pos);
                        if (is_correct || today_save.attempts.length >= 5) {
                            setFinished(true);
                            setFinishedCorrectly(is_correct);
                        }
                    } else {
                        setCurrentOrder(data.puzzle);
                    }
                } else {
                    setCurrentOrder(data.puzzle);
                }

                if (on_loaded) {
                    on_loaded();
                }
            }).catch((err) => {
                console.error("Error fetching today's data:", err);
                if (on_load_error) {
                    on_load_error(err);
                }
            });
    }, [date_override, on_load_error, on_loaded]);

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
            const save_state: SaveStateDay = {
                current_order_ids: guess.map((stat) => stat.id),
                attempts: [...attempts, new_correct_positions],
                hardcore
            };

            const existing_saves = localStorage.getItem("rangle_state_v1");
            const parsed_saves = existing_saves ? JSON.parse(existing_saves) : {};
            parsed_saves[today_data.date] = save_state;
            localStorage.setItem("rangle_state_v1", JSON.stringify(parsed_saves));
            
            if (new_correct_positions.every((pos) => pos)) {
                setFinished(true);
                setFinishedCorrectly(true);

                // store in rangle_scores
                update_score(today_data.date, {
                    attempts: attempts.length + 1,
                    updated: new Date().toISOString(),
                    result: true,
                });

                return {
                    correct: true,
                    finished: true,
                    correct_positions: new_correct_positions,
                }
            } else if (attempts.length + 1 >= 5) {
                setFinished(true);

                // store in rangle_scores
                update_score(today_data.date, {
                    attempts: attempts.length + 1,
                    updated: new Date().toISOString(),
                    result: false,
                });

                return {
                    correct: false,
                    finished: true,
                    correct_positions: new_correct_positions,
                }
            } else {
                // store in rangle_scores as in progress
                update_score(today_data.date, {
                    attempts: attempts.length + 1,
                    updated: new Date().toISOString(),
                    result: undefined,
                });

                return {
                    correct: false,
                    finished: false,
                    correct_positions: new_correct_positions,
                }
            }
        },
        [today_data, attempts, hardcore, answers, update_score]
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
        finished_correctly,
        submit_guess,
        reveal_answers,
        hardcore,
        setHardcore,
    };
}
