import {Metadata} from "next";
import {Suspense} from "react";
import {LoadingSpinner} from "@/components/LoadingSpinner";
import {TestRunInteraction} from "@/components/TestRunInteraction";
import {VirtualSettingsProvider} from "@/context/SettingsContext";

export const metadata: Metadata = {
    title: "Test Run",
}

export default function TestRunPage() {
    return (
        <VirtualSettingsProvider>
            <main className="flex-1 flex-col m-4 pb-8 sm:pb-0 flex items-center justify-center">
                <h1 className="font-title text-3xl sm:text-4xl mb-1 mx-4 sm:mx-6 font-bold">Test Run</h1>

                <Suspense fallback={<LoadingSpinner className="mt-4" />}>
                    <TestRunInteraction/>
                </Suspense>
            </main>
        </VirtualSettingsProvider>
    );
}
