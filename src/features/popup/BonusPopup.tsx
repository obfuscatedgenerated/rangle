"use client";

import {useCallback, useEffect, useRef, useState} from "react";

import type {PuzzleStat} from "@/features/game/Game";
import {SearchSpotlights} from "@/features/game/SearchSpotlights";
import {useAudioPlayer} from "react-use-audio-player";
import {useSettingValue} from "@/context/SettingsContext";

interface BonusPopupProps {
    open: boolean;
    on_finish: (results: Record<string, boolean>) => void;
    bonus_rounds: PuzzleStat[];
}

export const BonusPopup = ({open, on_finish, bonus_rounds}: BonusPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    const [input_states, setInputStates] = useState<Record<string, string>>({});

    const dispatch_input_state = useCallback(
        ({ id, value }: { id: string, value: string }) => {
            setInputStates((prev) => ({ ...prev, [id]: value }));
        },
        []
    );

    const [card_classes, setCardClasses] = useState<Record<string, string>>({});

    const [suspenseful, setSuspenseful] = useState(false);
    const [revealed_answers, setRevealedAnswers] = useState<boolean>(false);

    const drumroll = useAudioPlayer("/drumroll.mp3", {
        autoplay: false,
        loop: false
    });

    const [sound_enabled] = useSettingValue("sound");

    const handle_submit = useCallback(
        () => {
            const results: Record<string, boolean> = {};

            for (const stat of bonus_rounds) {
                const input_value = input_states[stat.id];

                if (!input_value) {
                    // TODO: better ux
                    alert("Please fill in all guesses before submitting!");
                    return;
                }

                const input_number = parseFloat(input_value);

                if (isNaN(input_number)) {
                    alert("Please enter valid numbers for all guesses!");
                    return;
                }

                const lower_bound = stat.value * 0.9;
                const upper_bound = stat.value * 1.1;

                results[stat.id] = input_number >= lower_bound && input_number <= upper_bound;
            }

            setSuspenseful(true);

            if (sound_enabled) {
                drumroll.seek(0);
                drumroll.play();
            }

            setTimeout(() => {
                setSuspenseful(false);

                // reveal results after the delay, marking the ones that were within the 5% margin as correct and the others as incorrect
                const new_card_classes: Record<string, string> = {};
                const new_input_states: Record<string, string> = {};

                for (const stat of bonus_rounds) {
                    const correct = results[stat.id];

                    new_card_classes[stat.id] = correct ? "border-2 border-green-500" : "border-2 border-red-500";
                    new_input_states[stat.id] = `${stat.prefix}${stat.value.toLocaleString()}${stat.suffix}`
                }

                setCardClasses(new_card_classes);
                setInputStates(new_input_states);

                setRevealedAnswers(true);

                setTimeout(() => {
                    on_finish(results);
                }, 3000);
            }, 3000);
        },
        [bonus_rounds, drumroll, input_states, on_finish, sound_enabled]
    );

    return (
        <>
            <SearchSpotlights active={suspenseful} />

            <dialog ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
                <h2 className="font-title text-xl font-bold">Bonus Round!</h2>

                <b className="mt-2">Congratulations on solving today&apos;s Rangle!</b>
                <p className="text-center text-balance">However, {bonus_rounds.length === 1 ? "one of the" : "some"} values {bonus_rounds.length === 1 ? "has" : "have"}n&apos;t been revealed...</p>

                <p className="my-4 text-center text-pretty">Can you guess the missing value{bonus_rounds.length > 1 ? "s" : ""} <b>within 10%</b> to score {bonus_rounds.length === 1 ? "a" : "some"} bonus point{bonus_rounds.length === 1 ? "" : "s"}?</p>

                <div className="flex flex-col items-center mt-4">
                    {bonus_rounds.map((stat, index) => (
                        <div key={index} className={`mb-4 p-4 bg-background rounded w-full ${card_classes[stat.id]}`}>
                            <p className="text-pretty text-center text-lg sm:text-2xl font-bold">{stat.name}</p>
                            <p className="uppercase tracking-wider text-pretty text-sm sm:text-base text-center mb-2">{stat.metric}</p>

                            <input
                                disabled={suspenseful || revealed_answers}

                                className="w-full p-2 border border-gray-300 rounded mb-2 text-center"
                                type={revealed_answers ? "text" : "number"}
                                placeholder={`Your guess${stat.unit_hint ? ` (${stat.unit_hint})` : ""}`}

                                value={input_states[stat.id] || ""}
                                onChange={(e) => dispatch_input_state({ id: stat.id, value: e.target.value })}
                            />

                            <p className="text-pretty text-center text-sm opacity-60">({stat.description})</p>
                        </div>
                    ))}
                </div>

                <button
                    disabled={suspenseful || revealed_answers}
                    className="w-full text-lg font-bold uppercase tracking-wider mt-4 mb-2 sm:mt-6 sm:mb-4 px-4 py-3 bg-primary text-on-primary rounded cursor-pointer transition-colors duration-1000 disabled:bg-primary/50 disabled:cursor-not-allowed"
                    onClick={handle_submit}
                >
                    Submit guess{bonus_rounds.length > 1 ? "es" : ""}
                </button>
            </dialog>
        </>
    );
}
