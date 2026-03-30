import {Metadata} from "next";

import EPOCH from "../../../epoch";
import Link from "next/link";

export const metadata: Metadata = {
    title: "The Archive"
}

export default function ArchivePage() {
    // for every day going backwards until the epoch, add a link to the puzzle
    const today = new Date();
    const iso_dates = [];
    for (let date = today; date >= EPOCH; date.setUTCDate(date.getUTCDate() - 1)) {
       iso_dates.push(date.toISOString().split("T")[0]);
    }

    // TODO: proper ui, pagination maybe too

    return (
        <main className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1>The Archive</h1>
            <h2>(this is a work in progress!)</h2>

            <br />

            {iso_dates.map((date_str, index) => (
                <div key={date_str}>
                    <Link href={`/?d=${date_str}`} className="text-blue-500 hover:underline">
                        [{index === 0 ? "Today" : (iso_dates.length - index)}] {date_str}
                    </Link>
                </div>
            ))}
        </main>
    );
}
