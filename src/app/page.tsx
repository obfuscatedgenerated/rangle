import {InfoPopup} from "@/components/InfoPopup";
import {Game} from "@/components/Game";

export default function Home() {
    return (
        <main className="flex-1 flex-col m-4 flex items-center justify-center">
            <InfoPopup/>

            <h1 className="font-title text-3xl sm:text-4xl font-bold">Rangle</h1>
            <Game />

            <p className="fixed left-2 bottom-2 opacity-75 text-xs sm:text-base">Powered by <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" className="underline">Wikidata</a></p>
        </main>
    );
}
