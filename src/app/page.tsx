import {InfoPopup} from "@/components/InfoPopup";
import {Game} from "@/components/Game";

export default function Home() {
    return (
        <main className="flex-1 flex-col m-4 flex items-center justify-center">
            <InfoPopup/>

            <h1 className="text-4xl font-bold">Rangle</h1>
            <Game />
        </main>
    );
}
