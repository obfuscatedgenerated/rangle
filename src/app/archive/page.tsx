import {Metadata} from "next";
import {Suspense} from "react";

import {ArchiveGrid} from "@/components/ArchiveGrid";
import {LoadingSpinner} from "@/components/LoadingSpinner";

export const metadata: Metadata = {
    title: "The Archive"
}

export default function ArchivePage() {

    return (
        <main className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1>The Archive</h1>
            <h2>(this is a work in progress!)</h2>

            <br />

            <Suspense fallback={<LoadingSpinner />}>
                <ArchiveGrid />
            </Suspense>
        </main>
    );
}
