"use client";

import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {PuzzleStat} from "@/components/Game";

interface DraggableStatProps {
    stat: PuzzleStat;
    locked: boolean;
    reveal_values: boolean;
}

const DraggableStat = ({ stat, locked, reveal_values }: DraggableStatProps) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: stat.id,
        disabled: locked,
    });

    const drag_style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <div
            ref={locked ? undefined : setNodeRef}
            style={locked ? undefined : drag_style}
            {...attributes}
            {...listeners}
            className={`flex flex-col items-center justify-center gap-1 border-2 rounded p-4 w-full ${
                locked ? "bg-green-600 border-green-800" : "bg-zinc-900 border-gray-700 cursor-grab"
            }`}
        >
            {reveal_values && (
                <p className="text-2xl font-bold pointer-events-none">{stat.prefix}{stat.value}{stat.suffix}</p>
            )}
            <p className="text-2xl font-bold pointer-events-none">{stat.metric}</p>
            <p className="text-sm pointer-events-none">{stat.name}</p>
            <p className="text-sm opacity-60 pointer-events-none">({stat.description})</p>
        </div>
    );
};

interface DraggableStatsProps {
    puzzle: PuzzleStat[];
    on_reorder?: (new_order: PuzzleStat[]) => void;
    correct_positions: [boolean, boolean, boolean, boolean, boolean];
    reveal_values: boolean;
}

export const DraggableStats = ({puzzle, on_reorder, correct_positions, reveal_values}: DraggableStatsProps) => {
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
                <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
                    {puzzle.map((stat, index) => (
                        <DraggableStat
                            key={stat.id}
                            stat={stat}
                            locked={correct_positions[index]}
                            reveal_values={reveal_values}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
