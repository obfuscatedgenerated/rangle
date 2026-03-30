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

import type {PuzzleStat} from "@/components/Game";
import {useEffect, useState} from "react";
import {LinkIcon} from "lucide-react";

interface DraggableStatProps {
    stat: PuzzleStat;
    correct: boolean;
    finished: boolean;
    reveal_values: boolean;

    className?: string;
}

const DraggableStat = ({ stat, correct, finished, reveal_values, className = "" }: DraggableStatProps) => {
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
        if (reveal_values && value_display_state === "hidden") {
            setValueDisplayState("about_to_reveal");
        }

        if (reveal_values && value_display_state === "about_to_reveal") {
            // after a short delay, set to visible so that it appears with a fade-in transition
            const timeout = setTimeout(() => {
                setValueDisplayState("visible");
            }, 50);

            return () => clearTimeout(timeout);
        }
    }, [reveal_values, value_display_state]);

    const drag_style = {
        transform: CSS.Translate.toString(transform),
        transition: `${transition}, background-color 0.2s, border-color 0.2s`
    };

    // TODO: animate in link
    return (
        <div
            ref={correct ? undefined : setNodeRef}
            style={correct ? undefined : drag_style}
            {...attributes}
            {...listeners}
            className={`touch-none flex flex-col items-center justify-center gap-1 border-2 rounded p-4 w-full
            ${className}
            ${lock_position ? "" : "cursor-move"}
            `}
        >
            <p className="text-pretty text-center text-lg sm:text-2xl font-bold pointer-events-none">
                {reveal_values
                    ? (
                        <span className="flex items-center">
                            <a title={`Open ${stat.name} on Wikidata`} className="pointer-events-auto underline" href={`https://wikidata.org/wiki/${stat.id}`} target="_blank" rel="noopener noreferrer">
                                {stat.name}
                            </a>
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
    );
};

interface DraggableStatsProps {
    puzzle: PuzzleStat[];
    on_reorder?: (new_order: PuzzleStat[]) => void;
    correct_positions: [boolean, boolean, boolean, boolean, boolean];
    finished: boolean;
    reveal_values: boolean;

    correct_className?: string;
    incorrect_className?: string;
}

export const DraggableStats = ({
    puzzle,
    on_reorder,
    correct_positions,
    finished,
    reveal_values,
    correct_className = "bg-green-400 border-green-600 dark:bg-green-600 dark:border-green-800",
    incorrect_className = "bg-zinc-300 border-gray-400 dark:bg-zinc-900 dark:border-gray-700"
}: DraggableStatsProps) => {
    const handle_drag_end = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !on_reorder) {
            return;
        }

        const old_idx = puzzle.findIndex((p) => p.id === active.id);
        const new_idx = puzzle.findIndex((p) => p.id === over.id);

        const shifted = arrayMove(puzzle, old_idx, new_idx);

        // anything originally in a correct position should stay in the same position
        for (let i = 0; i < correct_positions.length; i++) {
            if (correct_positions[i]) {
                const correct_item = puzzle[i];
                const current_index = shifted.findIndex((item) => item.id === correct_item.id);
                if (current_index !== i) {
                    // move the correct item back to its original position
                    shifted.splice(current_index, 1);
                    shifted.splice(i, 0, correct_item);
                }
            }
        }

        on_reorder(shifted);
    };

    // filter out locked ids so sortable context doesn't even know they exist
    const sortable_ids = finished
        ? puzzle // everything should now be visible to the sortable context so it can animate to correct positions
        : puzzle
            .filter((_, index) => !correct_positions[index])
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
                            className={correct_positions[index] ? correct_className : incorrect_className}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
