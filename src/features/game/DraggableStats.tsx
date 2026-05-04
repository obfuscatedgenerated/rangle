"use client";

import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    defaultAnimateLayoutChanges
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {PuzzleStat} from "@/features/game/Game";
import {useEffect, useState} from "react";
import {LinkIcon} from "lucide-react";
import {NewTabLink} from "@/components/ui/NewTabLink";
import {ExpandableImage} from "@/components/ui/ExpandableImage";

interface DraggableStatProps {
    stat: PuzzleStat;
    correct: boolean;
    finished: boolean;
    reveal_values: boolean;
    bonus_round_reveal?: boolean;

    className?: string;
}

const CURRENCY_CODES: { [symbol: string]: string } = {
    "£": "GBP",
    "$": "USD",
    "€": "EUR",
}

const DraggableStat = ({ stat, correct, finished, reveal_values, bonus_round_reveal = false, className = "" }: DraggableStatProps) => {
    const lock_position = correct || finished;

    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: stat.id,
        disabled: lock_position,
        animateLayoutChanges: (args) => {
            if (finished) {
                // auto animate to correct positions when puzzle is finished
                return true;
            }

            // otherwise use normal animation logic
            return defaultAnimateLayoutChanges(args);
        },
    });

    const [value_display_state, setValueDisplayState] = useState<"hidden" | "about_to_reveal" | "visible">("hidden");

    useEffect(() => {
        if (!reveal_values) {
            setValueDisplayState("hidden");
            return;
        }

        // add to DOM just before starting animation to reveal values
        if (reveal_values && (!stat.bonus_round || bonus_round_reveal) && value_display_state === "hidden") {
            setValueDisplayState("about_to_reveal");
        }

        if (reveal_values && (!stat.bonus_round || bonus_round_reveal) && value_display_state === "about_to_reveal") {
            // after a short delay, set to visible so that it appears with a fade-in transition
            const timeout = setTimeout(() => {
                setValueDisplayState("visible");
            }, 50);

            return () => clearTimeout(timeout);
        }
    }, [bonus_round_reveal, reveal_values, stat.bonus_round, value_display_state]);

    const drag_style = {
        transform: CSS.Translate.toString(transform),
        transition: `${transition}, background-color 0.2s, border-color 0.2s`
    };

    // TODO: animate in link
    // @ts-ignore
    return (
        <div
            ref={correct ? undefined : setNodeRef}
            style={correct ? undefined : drag_style}
            {...attributes}
            {...listeners}
            className={`touch-none flex flex-col sm:flex-row items-center justify-start gap-4 sm:gap-8 border-2 rounded p-4 w-full
            ${className}
            ${lock_position ? "" : "cursor-move"}
            `}
        >
            {stat.image_url && <ExpandableImage src={stat.image_url} alt={stat.image_alt || `Image for ${stat.name}`} title="Click to expand" draggable="false" className="max-h-24 object-contain border-muted-foreground border-1 rounded-sm" />}

            <div className="flex flex-col items-center justify-center gap-1 flex-1">
                <p className="text-pretty text-center text-lg sm:text-2xl font-bold pointer-events-none">
                    {reveal_values && (!stat.bonus_round || bonus_round_reveal) && !stat.id.startsWith("!")
                        ? (
                            <span className="flex items-center">
                                <NewTabLink title={`Open ${stat.name} on Wikidata`} className="pointer-events-auto underline" href={`https://wikidata.org/wiki/${stat.id}`}>
                                    {stat.name}
                                </NewTabLink>
                                <LinkIcon className="ml-1 w-4 h-4" />
                            </span>
                        )
                        : stat.name
                    }
                </p>
                <p className="uppercase tracking-wider text-pretty text-sm sm:text-base text-center pointer-events-none mb-2">
                    {stat.metric}

                    {value_display_state !== "hidden"
                        && <span
                            className={`transition-opacity font-black tracking-normal normal-case ${value_display_state === "visible" ? "opacity-100" : "opacity-0"}`}
                        >
                            {`: ${stat.prefix}${
                                // TODO: less messy
                                stat.metric.toLowerCase().includes("price")
                                 ? Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY_CODES[stat.prefix]}).format(stat.value).replace(stat.prefix, "")
                                    :
                                // TODO: better property to specify this
                                stat.metric.toLowerCase().includes("year") 
                                    ? stat.value
                                    : stat.value.toLocaleString()
                            }${stat.suffix}`}
                        </span>
                    }

                    {value_display_state === "hidden" && <span>{stat.unit_hint ? ` (${stat.unit_hint})` : ""}</span>}
                </p>

                <p className="text-pretty text-center text-sm opacity-60 pointer-events-none">({stat.description})</p>
            </div>
        </div>
    );
};

interface DraggableStatsProps {
    puzzle: PuzzleStat[];
    on_reorder?: (new_order: PuzzleStat[]) => void;
    correct_positions: [boolean, boolean, boolean, boolean, boolean];
    finished: boolean;
    reveal_values: boolean;
    bonus_round_reveal?: boolean;

    correct_className?: string;
    incorrect_className?: string;
}

export const DraggableStats = ({
    puzzle,
    on_reorder,
    correct_positions,
    finished,
    reveal_values,
    bonus_round_reveal = false,
    correct_className = "bg-correct border-correct-border",
    incorrect_className = "bg-background-variant border-background-variant-border"
}: DraggableStatsProps) => {
    const handle_drag_end = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !on_reorder) {
            return;
        }

        if (finished) {
            const old_idx = puzzle.findIndex((p) => p.id === active.id);
            const new_idx = puzzle.findIndex((p) => p.id === over.id);
            on_reorder(arrayMove(puzzle, old_idx, new_idx));
            return;
        }

        const unlocked_items = puzzle.filter((_, idx) => !correct_positions[idx]);

        const old_unlocked_idx = unlocked_items.findIndex((p) => p.id === active.id);
        const new_unlocked_idx = unlocked_items.findIndex((p) => p.id === over.id);

        if (old_unlocked_idx === -1 || new_unlocked_idx === -1) {
            return;
        }

        const shifted_unlocked = arrayMove(unlocked_items, old_unlocked_idx, new_unlocked_idx);

        // anything originally in a correct position should stay in the same position
        let unlocked_ptr = 0;
        const new_puzzle = puzzle.map((item, idx) => {
            if (correct_positions[idx]) {
                return item;
            } else {
                return shifted_unlocked[unlocked_ptr++];
            }
        });

        on_reorder(new_puzzle);
    };

    // filter out locked ids so sortable context doesn't even know they exist
    const sortable_ids = (finished
        ? puzzle // everything should now be visible to the sortable context so it can animate to correct positions
        : puzzle
            .filter((_, index) => !correct_positions[index])
    )
            .map(p => p.id);

    return (
        <DndContext collisionDetection={closestCenter} onDragEnd={handle_drag_end}>
            <SortableContext items={sortable_ids} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2 sm:gap-4 w-full max-w-2xl mx-auto">
                    {puzzle.map((stat, index) => (
                        <DraggableStat
                            key={stat.id}
                            stat={stat}
                            correct={correct_positions[index]}
                            finished={finished}
                            reveal_values={reveal_values}
                            bonus_round_reveal={bonus_round_reveal}
                            className={correct_positions[index] ? correct_className : incorrect_className}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
