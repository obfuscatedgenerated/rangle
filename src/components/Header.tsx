"use client";

import {InfoPopup} from "@/components/InfoPopup";

import {CalendarDays, ChartNoAxesCombined, Info, Settings} from "lucide-react";

import {ComponentType, useEffect, useState} from "react";
import Link from "next/link";
import {StatsPopup} from "@/components/StatsPopup";
import {SettingsPopup} from "@/components/SettingsPopup";

const HeaderIconButton = ({ Icon, title, on_click }: { Icon: ComponentType, title: string, on_click: () => void }) => (
    <button onClick={on_click} className="cursor-pointer p-3 aspect-square" title={title}>
        <Icon />
    </button>
);

const HeaderIconLink = ({ Icon, title, href }: { Icon: ComponentType, title: string, href: string }) => (
    <Link href={href} className="cursor-pointer p-3 aspect-square" title={title}>
        <Icon />
    </Link>
);

interface HeaderProps {

}

export const Header = ({}: HeaderProps) => {
    const [show_info_popup, setShowInfoPopup] = useState(false);
    const [show_stats_popup, setShowStatsPopup] = useState(false);
    const [show_settings_popup, setShowSettingsPopup] = useState(false);

    useEffect(() => {
        // when ready, show the dialog if not shown before
        if (localStorage.getItem("info_popup_shown") === "true") {
            return;
        }

        localStorage.setItem("info_popup_shown", "true");
        setShowInfoPopup(true);
    }, []);

    return (
        <>
            <header className="w-full max-w-3xl mx-auto p-4 flex items-center justify-between">
                <HeaderIconButton Icon={Info} title="Info" on_click={() => setShowInfoPopup(true)} />
                <HeaderIconButton Icon={ChartNoAxesCombined} title="Stats" on_click={() => setShowStatsPopup(true)} />

                <h1 className="font-title text-3xl sm:text-4xl mb-1 mx-6 font-bold">Rangle</h1>

                <HeaderIconLink Icon={CalendarDays} title="Archive" href="/archive" />
                <HeaderIconButton Icon={Settings} title="Settings" on_click={() => setShowSettingsPopup(true)} />
            </header>

            <InfoPopup open={show_info_popup} on_close={() => setShowInfoPopup(false)} />
            <StatsPopup open={show_stats_popup} on_close={() => setShowStatsPopup(false)} />
            <SettingsPopup open={show_settings_popup} on_close={() => setShowSettingsPopup(false)} />
        </>
    )
}
