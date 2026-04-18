"use client";

import {time_zone} from "../../time";

import {PuzzleStat, StatPositionFlags, TodayData} from "@/components/Game";
import {useRangleScores} from "@/context/RangleScoresContext";
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {useSettingValue} from "@/context/SettingsContext";
import {useCloudSync} from "@/context/CloudSyncContext";
import {cloud_bus, CLOUD_SYNC_EVENTS} from "@/util/event_bus";

interface RangleStateHookProps {
    on_loaded?: () => void;
    on_load_error?: (err: Error) => void;
    date_override?: string;
}

export interface SaveStateDay {
    current_order_ids: string[];
    attempts: StatPositionFlags[];
    previous_guess_ids?: string[][]; // TODO: remove attempts field and compute on demand
    hardcore?: boolean;
    bonus_results?: Record<string, boolean>;
    updated?: string;
}

export type SaveState = Record<string, SaveStateDay>;

interface RangleStateContextType {
    today_data: TodayData | null;
    current_order: PuzzleStat[];
    correct_positions: StatPositionFlags;
    attempts: StatPositionFlags[];
    previous_guesses: PuzzleStat[][];
    finished: boolean;
    finished_correctly: boolean;
    hardcore: boolean;
    bonus_results: Record<string, boolean>;

    load_puzzle: (props?: RangleStateHookProps) => void;
    submit_guess: (guess: PuzzleStat[]) => { correct: boolean; finished: boolean; correct_positions: StatPositionFlags };
    reveal_answers: () => void;
    set_bonus_results: (results: Record<string, boolean>) => void;
    set_current_order: (new_order: PuzzleStat[]) => void;
    set_hardcore: (hardcore: boolean) => void;
    reload_today_from_storage: () => void;
}

const RangleStateContext = createContext<RangleStateContextType | undefined>(undefined);

export const RangleStateProvider = ({children}: { children: React.ReactNode }) => {
    const [today_data, setTodayData] = useState<TodayData | null>(null);
    const fetched_date = useRef<string | null>(null);

    const [current_order, setCurrentOrder] = useState<PuzzleStat[]>([]);
    const [correct_positions, setCorrectPositions] = useState<StatPositionFlags>([false, false, false, false, false]);

    const [attempts, setAttempts] = useState<StatPositionFlags[]>([]);
    const [previous_guesses, setPreviousGuesses] = useState<PuzzleStat[][]>([]);
    // TODO: make attempts a computed value from previous_guesses and correct_positions
    // TODO: store only ids, not full stats, then compute out

    const [finished, setFinished] = useState(false);
    const [finished_correctly, setFinishedCorrectly] = useState(false);

    const [default_hardcore] = useSettingValue("default_hardcore");
    const [hardcore, setHardcore] = useState(default_hardcore);

    const [bonus_results, setBonusResults] = useState<Record<string, boolean>>({});

    const {update_score} = useRangleScores();
    
    const {push_update} = useCloudSync();

    // sync hardcore setting with default from settings context if no attempts have been made yet
    useEffect(() => {
        if (attempts.length === 0) {
            setHardcore(default_hardcore);
        }
    }, [default_hardcore, attempts.length]);

    const load_puzzle = useCallback(
        ({on_loaded, on_load_error, date_override}: RangleStateHookProps = {}) => {
            const today_date_iso = date_override
                ? date_override
                : new Date().toLocaleDateString("en-CA", {timeZone: time_zone});

            if (fetched_date.current === today_date_iso) {
                if (on_loaded) {
                    on_loaded();
                }
                return;
            }
            fetched_date.current = today_date_iso;

            // clear existing state when loading a new puzzle
            setTodayData(null);
            setCurrentOrder([]);
            setCorrectPositions([false, false, false, false, false]);
            setAttempts([]);
            setPreviousGuesses([]);
            setFinished(false);
            setFinishedCorrectly(false);
            setBonusResults({});

            fetch(`/daily/${today_date_iso}.json`)
                .then((res) => {
                    if (!res.ok) {
                        const err_msg = res.status === 404 ? "NO_PUZZLE" : res.statusText;
                        throw new Error(err_msg);
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

                            const saved_previous_guesses = (today_save.previous_guess_ids || []).map((guess_ids: string[]) => guess_ids.map((id: string) => id_to_stat[id]));
                            setPreviousGuesses(saved_previous_guesses);

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

                            if (today_save.bonus_results) {
                                setBonusResults(today_save.bonus_results);
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
                })
                .catch((err) => {
                    fetched_date.current = null;
                    console.error("Error loading today's data:", err);
                    if (on_load_error) {
                        on_load_error(err);
                    }
                });
        },
        []
    );

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
            setPreviousGuesses((prev) => [...prev, guess]);

            // save state to local storage
            const save_state: SaveStateDay = {
                current_order_ids: guess.map((stat) => stat.id),
                attempts: [...attempts, new_correct_positions],
                previous_guess_ids: [...previous_guesses, guess].map((guess) => guess.map((stat) => stat.id)),
                hardcore,
                updated: new Date().toISOString(),
            };

            const existing_saves = localStorage.getItem("rangle_state_v1");
            const parsed_saves = existing_saves ? JSON.parse(existing_saves) : {};
            parsed_saves[today_data.date] = save_state;
            localStorage.setItem("rangle_state_v1", JSON.stringify(parsed_saves));
            
            // push update to the cloud
            push_update(today_data.date, save_state);

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
        [today_data, attempts, previous_guesses, hardcore, push_update, answers, update_score]
    );

    const reveal_answers = useCallback(
        () => {
            setCurrentOrder(answers);
        },
        [answers]
    );

    const set_bonus_results = useCallback(
        (results: Record<string, boolean>) => {
            if (!today_data) {
                throw new Error("Today's data not loaded yet");
            }

            // save bonus round results to local storage, expecting an existing save for today
            const existing_saves = localStorage.getItem("rangle_state_v1");
            const parsed_saves = existing_saves ? JSON.parse(existing_saves) : {};
            const today_save = parsed_saves?.[today_data.date];
            if (!today_save) {
                alert("No existing save found for today when trying to set bonus results");
                return;
            }

            today_save.bonus_results = results;
            today_save.updated = new Date().toISOString();
            parsed_saves[today_data.date] = today_save;
            localStorage.setItem("rangle_state_v1", JSON.stringify(parsed_saves));

            // push update to the cloud
            push_update(today_data.date, today_save);

            setBonusResults(results);
        },
        [today_data, push_update]
    );

    const reload_today_from_storage = useCallback(
        () => {
            if (!today_data) {
                return;
            }

            const today_date_iso = today_data.date;

            const saved_state = localStorage.getItem("rangle_state_v1");
            if (saved_state) {
                const parsed_state = JSON.parse(saved_state);
                const today_save = parsed_state?.[today_date_iso];
                if (today_save) {
                    // resolve ids to full order object
                    const id_to_stat: Record<string, PuzzleStat> = {};
                    today_data.puzzle.forEach((stat: PuzzleStat) => {
                        id_to_stat[stat.id] = stat;
                    });

                    if (today_save.hardcore === true) {
                        setHardcore(true);
                    } else if (today_save.hardcore === false) {
                        setHardcore(false);
                    }

                    const saved_order = today_save.current_order_ids.map((id: string) => id_to_stat[id]);
                    setCurrentOrder(saved_order);

                    const saved_previous_guesses = (today_save.previous_guess_ids || []).map((guess_ids: string[]) => guess_ids.map((id: string) => id_to_stat[id]));
                    setPreviousGuesses(saved_previous_guesses);

                    // evaluate correct positions for saved order
                    const answers = [...today_data.puzzle].sort((a, b) => a.value - b.value);
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

                    if (today_save.bonus_results) {
                        setBonusResults(today_save.bonus_results);
                    }
                }
            }
        },
        [today_data]
    );

    // listen to cloud event bus for reloading today
    useEffect(() => {
        cloud_bus.on(CLOUD_SYNC_EVENTS.RELOAD_LOCAL_STATE, reload_today_from_storage);

        return () => {
            cloud_bus.off(CLOUD_SYNC_EVENTS.RELOAD_LOCAL_STATE, reload_today_from_storage);
        };
    }, [reload_today_from_storage]);

    // TODO: sync state across tabs, handling conflicting date overrides

    return (
        <RangleStateContext.Provider value={{
            today_data,
            current_order,
            correct_positions,
            attempts,
            previous_guesses,
            finished,
            finished_correctly,
            hardcore,
            bonus_results,
            load_puzzle,
            submit_guess,
            reveal_answers,
            set_bonus_results,
            set_current_order: setCurrentOrder,
            set_hardcore: setHardcore,
            reload_today_from_storage
        }}>
            {children}
        </RangleStateContext.Provider>
    );
}

export const useRangleState = () => {
    const context = useContext(RangleStateContext);
    if (!context) {
        throw new Error("useRangleState must be used within a RangleStateProvider");
    }
    return context;
}
