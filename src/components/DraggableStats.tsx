"use client";

import {DragDropContext, Droppable, Draggable, DropResult} from "@hello-pangea/dnd";

import type {PuzzleStat} from "@/components/Game";

interface DraggableStatsProps {
    puzzle: PuzzleStat[];
    on_reorder?: (new_order: PuzzleStat[]) => void;
    correct_positions: [boolean, boolean, boolean, boolean, boolean];
    reveal_values: boolean;
}

export const DraggableStats = ({puzzle, on_reorder, correct_positions, reveal_values}: DraggableStatsProps) => {
    const handle_drag_end = (result: DropResult) => {
        if (!result.destination || !on_reorder) {
            return;
        }

        const items = Array.from(puzzle);
        const [reordered_item] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered_item);

        // anything originally in a correct position should stay in the same position
        for (let i = 0; i < correct_positions.length; i++) {
            if (correct_positions[i]) {
                const correct_item = puzzle[i];
                const current_index = items.findIndex((item) => item.id === correct_item.id);
                if (current_index !== i) {
                    // move the correct item back to its original position
                    items.splice(current_index, 1);
                    items.splice(i, 0, correct_item);
                }
            }
        }

        on_reorder(items);
    };

    // TODO: actually lock the correct positions to avoid consuing animation. might need dnd-kit
    return (
        <DragDropContext onDragEnd={handle_drag_end}>
            <Droppable droppableId="puzzle-list">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex flex-col items-center justify-center gap-4 w-full max-w-2xl"
                    >
                        {puzzle.map((stat, index) => (
                            <Draggable key={stat.id} draggableId={stat.id} index={index} isDragDisabled={correct_positions[index]}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`flex flex-col items-center justify-center gap-1 border-2 border-gray-300 rounded p-4 w-full ${correct_positions[index] ? "bg-green-500 border-green-700 cursor-default" : "bg-background-variant cursor-move"}`}
                                    >
                                        {reveal_values && (
                                            <p className="text-2xl font-bold pointer-events-none">{stat.prefix}{stat.value}{stat.suffix}</p>
                                        )}
                                        <p className="text-2xl font-bold pointer-events-none">{stat.metric}</p>
                                        <p className="text-sm pointer-events-none">{stat.name}</p>
                                        <p className="text-sm opacity-60 pointer-events-none">({stat.description})</p>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}
