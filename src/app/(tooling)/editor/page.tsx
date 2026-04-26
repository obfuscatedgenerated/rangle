import type {Metadata} from "next";
import {Suspense} from "react";

import {LoadingSpinner} from "@/components/LoadingSpinner";
import {EditorInteraction} from "@/components/EditorInteraction";

export const metadata: Metadata = {
    title: "Editor",
}

export default function EditorPage() {
    return (
        <main className="flex-1 flex-col m-4 pb-8 sm:pb-0 flex items-center justify-center">
            <h1 className="text-4xl font-bold mb-4">Editor</h1>

            <Suspense fallback={<LoadingSpinner />}>
                <EditorInteraction />
            </Suspense>
        </main>
    );
}
