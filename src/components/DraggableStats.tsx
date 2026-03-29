"use client";

import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {PuzzleStat} from "@/components/Game";

interface DraggableStatProps {
    stat: PuzzleStat;
    correct: boolean;
    finished: boolean;

    className?: string;
}

const DraggableStat = ({ stat, correct, finished, className = "" }: DraggableStatProps) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: stat.id,
        disabled: correct || finished,
    });

    const drag_style = {
        transform: CSS.Translate.toString(transform),
        transition: `${transition}, background-color 0.2s, border-color 0.2s`
    };

    return (
        <div
            ref={correct ? undefined : setNodeRef}
            style={correct ? undefined : drag_style}
            {...attributes}
            {...listeners}
            className={`flex flex-col items-center justify-center gap-1 border-2 rounded p-4 w-full
            ${className}
            ${correct || finished ? "" : "cursor-move"}
            `}
        >
            <p className="text-balance text-center text-lg sm:text-2xl font-bold pointer-events-none">{stat.metric}{
                finished
                    ? `: ${stat.prefix}${stat.value.toLocaleString()}${stat.suffix}`
                    : stat.unit_hint ? ` (${stat.unit_hint})` : ""
            }</p>
            <p className="text-sm pointer-events-none">{stat.name}</p>
            <p className="text-sm opacity-60 pointer-events-none">({stat.description})</p>
        </div>
    );
};

interface DraggableStatsProps {
    puzzle: PuzzleStat[];
    on_reorder?: (new_order: PuzzleStat[]) => void;
    correct_positions: [boolean, boolean, boolean, boolean, boolean];
    finished: boolean;

    correct_className?: string;
    incorrect_className?: string;
}

export const DraggableStats = ({
    puzzle,
    on_reorder,
    correct_positions,
    finished,
    correct_className = "bg-green-600 border-green-800",
    incorrect_className = "bg-zinc-900 border-gray-700"
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
    const sortable_ids = puzzle
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
                            className={correct_positions[index] ? correct_className : incorrect_className}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

// TODO: gradual reveal animation
