"use client";

import {DraggableStats} from "@/features/game/DraggableStats";
import {SharePopup} from "@/features/popup/SharePopup";
import {Toast} from "@/components/ui/Toast";
import {HardcoreToggle} from "@/features/game/HardcoreToggle";

import {useRangleState} from "@/context/RangleStateContext";
import {useWindowSize} from "@/hooks/useWindowSize";

import {epoch_utc, time_zone} from "../../../time";

import {useState, useEffect, useCallback, useMemo, useRef} from "react";

import ReactConfetti from "react-confetti";
import {useSettingValue} from "@/context/SettingsContext";
import {THEMES} from "@/themes";
import {BonusPopup} from "@/features/popup/BonusPopup";
import {useAudioPlayer} from "react-use-audio-player";

import {Activity, DiscordPresence} from "@/components/meta/DiscordPresence";
import {LeaderboardPopup} from "@/features/popup/LeaderboardPopup";

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
    unit_hint?: string;
    bonus_round?: boolean;
    image_url?: string;
    image_alt?: string;
}

export type StatPositionFlags = [boolean, boolean, boolean, boolean, boolean];

interface GameProps {
    archive_date?: string;
    on_loaded?: () => void;
    leaderboard_is_open: boolean;
    open_leaderboard: () => void;
    close_leaderboard: () => void;
}

export const Game = ({archive_date, on_loaded, leaderboard_is_open, open_leaderboard, close_leaderboard}: GameProps) => {
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
        set_hardcore,
        bonus_results,
        set_bonus_results,
        previous_guesses,
        load_puzzle
    } = useRangleState();

    // load puzzle on mount
    useEffect(() => {
        load_puzzle({
            on_loaded,
            on_load_error,
            date_override
        });
    }, [date_override, load_puzzle, on_load_error, on_loaded]);

    const [just_attempted, setJustAttempted] = useState(false);

    const [reveal_values, setRevealValues] = useState(false);

    const [bonus_popup_open, setBonusPopupOpen] = useState(false);
    const [bonus_round_reveal, setBonusRoundReveal] = useState(false);

    const [share_open, setShareOpen] = useState(false);

    const [toast_message, setToastMessage] = useState("");
    const [toast_visible, setToastVisible] = useState(false);

    const window_size = useWindowSize();

    // reset game state when archive date changes
    useEffect(() => {
        end_game_guard.current = false;
        setRevealValues(false);
        setBonusRoundReveal(false);
        setJustAttempted(false);
        setShareOpen(false);
    }, [archive_date]);

    const correct_sound = useAudioPlayer("/correct.mp3", {
        autoplay: false,
        loop: false,
        initialVolume: 0.75
    });

    const incorrect_sound = useAudioPlayer("/incorrect.mp3", {
        autoplay: false,
        loop: false,
        initialVolume: 0.5
    });

    const swoosh_sound = useAudioPlayer("/swoosh.mp3", {
        autoplay: false,
        loop: false,
        initialVolume: 0.75
    });
    
    const [sound_enabled] = useSettingValue("sound");

    const check_answer = useCallback(
        () => {
            if (!today_data) {
                return;
            }
            
            if (finished) {
                return;
            }

            if (previous_guesses.some((guess) => guess.every((value, index) => value === current_order[index]))) {
                setToastMessage("You've already tried that order!");
                setToastVisible(true);
                setTimeout(() => {
                    setToastVisible(false);
                }, 2000);
                return;
            }

            // trigger just attempted state for styling purposes
            setJustAttempted(true);
            setTimeout(() => {
                setJustAttempted(false);
            }, 1000);

            const {correct_positions: new_correct_positions} = submit_guess(current_order);
            
            if (sound_enabled) {
                if (new_correct_positions.every((pos) => pos)) {
                    correct_sound.seek(0);
                    correct_sound.play();
                } else {
                    incorrect_sound.seek(0);
                    incorrect_sound.play();
                }
            }

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
        [today_data, finished, previous_guesses, submit_guess, current_order, sound_enabled, hardcore, correct_sound, incorrect_sound]
    );

    const bonus_rounds = useMemo(() => {
        if (!today_data) {
            return [];
        }

        return today_data.puzzle.filter((stat) => stat.bonus_round);
    }, [today_data]);

    const on_post_bonus_round = useCallback(
        (results: Record<string, boolean> | null = null) => {
            if (results) {
                set_bonus_results(results);
            }

            setBonusPopupOpen(false);
            setBonusRoundReveal(true);

            setTimeout(() => {
                setShareOpen(true);
            }, 1500);
        },
        [set_bonus_results]
    );

    const end_game_guard = useRef(false);

    // trigger end game logic when game finishes (as it could be triggered by either submit_guess or loading saved state on mount)
    // TODO: this kinda sucks
    useEffect(() => {
        if (end_game_guard.current || !finished || !today_data) {
            return;
        }

        const expected_date_iso = date_override || new Date().toLocaleDateString("en-CA", { timeZone: time_zone });
        if (today_data.date !== expected_date_iso) {
            return;
        }

        end_game_guard.current = true;
        
        // game finished, trigger end game logic
        if (finished_correctly) {
            // if everything is correct, fire the finish logic
            setRevealValues(true);

            if (bonus_rounds.length > 0 && Object.keys(bonus_results).length === 0) {
                setTimeout(() => {
                    setBonusPopupOpen(true);
                }, 1000);
            } else {
                // skip bonus round if there arent any bonus rounds, or already been played from saved state
                on_post_bonus_round();
            }
        } else {
            // if reached attempt limit, reveal the answer
            // reveal the values after a delay
            setTimeout(() => {
                setRevealValues(true);
            }, 1000);

            // reveal the order after a slightly longer delay
            setTimeout(() => {
                reveal_answers();
                
                if (sound_enabled) {
                    swoosh_sound.seek(0);
                    swoosh_sound.play();
                }

                // skip bonus round if they didn't win!
                on_post_bonus_round();
            }, 2000);
        }
    }, [finished, finished_correctly, bonus_rounds.length, on_post_bonus_round, reveal_answers, bonus_results, sound_enabled, swoosh_sound, today_data, date_override]);

    const [theme_id] = useSettingValue("theme");

    const theme_confetti_colors = useMemo(
        () => {
            const theme_data = THEMES[theme_id as keyof typeof THEMES];
            if (theme_data && theme_data.confetti_colors) {
                return theme_data.confetti_colors;
            }

            return undefined;
        },
        [theme_id]
    );

    // compute discord presence
    const activity: Activity | undefined = useMemo(() => {
        if (!today_data) {
            return undefined;
        }
        
        let details_prefix = "Attempting";
        if (finished) {
            details_prefix = finished_correctly ? "Finished" : "Failed";
        }
        
        let attempts_value: string | number = finished ? attempts.length : attempts.length + 1;
        if (attempts_value > 5) {
            attempts_value = "X";
        }
        
        let state_suffix = "";
        if (hardcore) {
            state_suffix = " (Hardcore)";
        }

        return {
            type: 0,
            details: `${details_prefix} Rangle #${today_data.number} | ${today_data.difficulty}`,
            state: `${attempts_value}/5 attempts${state_suffix}`,
        };
    }, [today_data, finished, attempts.length, hardcore, finished_correctly]);

    if (!today_data) {
        return null;
    }

    return (
        <>
            <DiscordPresence activity={activity} />

            <SharePopup
                archive_date={archive_date}
                open={share_open}
                on_close={() => setShareOpen(false)}
                attempts={attempts}
                hardcore={hardcore}
                bonus_results={bonus_results}
                today_data={today_data}
                open_leaderboard={open_leaderboard}
            />

            <LeaderboardPopup open={leaderboard_is_open} on_close={close_leaderboard} today_data={today_data} />

            <BonusPopup open={bonus_popup_open} on_finish={on_post_bonus_round} bonus_rounds={bonus_rounds} />

            <div className="flex mb-4 sm:mb-6 items-center justify-center gap-8">
                <p className="text-sm sm:text-lg text-center text-pretty">#{today_data.number} | {today_data.difficulty} • Attempt: {finished ? attempts.length : attempts.length + 1}/5</p>
                <HardcoreToggle className="text-nowrap" hardcore={hardcore} attempt_count={attempts.length} on_toggle={set_hardcore} />
            </div>

            <div className="flex flex-col items-center gap-2">
                <div className="flex">
                    <DraggableStats
                        puzzle={current_order}
                        on_reorder={set_current_order}
                        correct_positions={(hardcore && !finished) ? [false, false, false, false, false] : correct_positions}
                        finished={finished}
                        reveal_values={reveal_values}
                        incorrect_className={!hardcore && just_attempted ? "bg-incorrect border-incorrect-border animate-shake-horizontal" : undefined}
                        bonus_round_reveal={bonus_round_reveal}
                    />

                    <div className="flex flex-col items-center ml-4 sm:ml-6 opacity-33">
                        <span className="text-xs font-bold uppercase tracking-widest">
                            <span className="hidden sm:inline">Smallest</span>
                            <span className="inline sm:hidden">Min</span>
                        </span>
                        <div className="w-px flex-grow bg-gradient-to-b from-arrow-start via-arrow-middle to-arrow-end my-2 relative">
                            <div className="absolute bottom-0 -left-[4px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-arrow-middle" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">
                            <span className="hidden sm:inline">Largest</span>
                            <span className="inline sm:hidden">Max</span>
                        </span>
                    </div>
                </div>

                <button disabled={finished} className="w-full text-lg font-bold uppercase tracking-wider mt-4 mb-2 sm:mt-6 sm:mb-4 px-4 py-3 bg-primary text-on-primary rounded cursor-pointer disabled:bg-disabled disabled:cursor-auto" onClick={check_answer}>
                    Check
                </button>
            </div>

            {finished_correctly && (
                <ReactConfetti style={{position: "fixed"}} width={window_size.width} height={window_size.height} colors={theme_confetti_colors} />
            )}

            <Toast message={toast_message} visible={toast_visible} position="center" />
        </>
    );
}

// TODO: way to get back share popup
// TODO: archives
