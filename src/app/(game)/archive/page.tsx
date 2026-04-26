import {Metadata} from "next";
import {Suspense} from "react";

import {LoadingSpinner} from "@/components/ui/LoadingSpinner";
import {ArchiveInteraction} from "@/app/(game)/archive/ArchiveInteraction";

export const metadata: Metadata = {
    title: "The Archive"
}

export default function ArchivePage() {

    return (
        <main className="flex flex-col items-center min-h-screen py-8 gap-8">
            <h1 className="text-2xl font-bold uppercase tracking-widest">The Archive</h1>

            <Suspense fallback={<LoadingSpinner />}>
                <ArchiveInteraction />
            </Suspense>
        </main>
    );
}
