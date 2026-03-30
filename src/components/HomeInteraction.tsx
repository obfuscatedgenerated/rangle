"use client";

import {InfoPopup} from "@/components/InfoPopup";
import {Game} from "@/components/Game";

import {useEffect, useState} from "react";

export const HomeInteraction = () => {
    const [show_info_popup, setShowInfoPopup] = useState(false);

    useEffect(() => {
        // when ready, show the dialog if not shown before
        if (localStorage.getItem("info_popup_shown") === "true") {
            return;
        }

        localStorage.setItem("info_popup_shown", "true");
        setShowInfoPopup(true);
    }, []);

    return (
        <main className="flex-1 flex-col m-4 pb-4 sm:pb-0 flex items-center justify-center">
            <InfoPopup open={show_info_popup} on_close={() => setShowInfoPopup(false)} />

            <h1 className="font-title text-3xl sm:text-4xl mb-1 font-bold">Rangle</h1>
            <Game on_info_click={() => setShowInfoPopup(true)} />

            <p className="sm:fixed left-2 bottom-2 opacity-75 text-xs sm:text-base">Powered by <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" className="underline">Wikidata</a></p>
        </main>
    );
}
