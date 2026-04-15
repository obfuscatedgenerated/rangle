"use client";

import {InfoPopup} from "@/components/InfoPopup";

import {CalendarDays, ChartNoAxesCombined, Cloud, Info, Settings} from "lucide-react";

import {ComponentType, useEffect, useState} from "react";
import Link from "next/link";
import {StatsPopup} from "@/components/StatsPopup";
import {SettingsPopup} from "@/components/SettingsPopup";
import {LoginButton} from "@/components/LoginButton";

const HeaderIconButton = ({ Icon, title, on_click, disabled = false }: { Icon: ComponentType, title: string, on_click: () => void, disabled?: boolean }) => (
    <button onClick={on_click} className="cursor-pointer p-3 aspect-square disabled:text-gray-500 disabled:cursor-auto" title={title} disabled={disabled}>
        <Icon />
    </button>
);

const HeaderIconLink = ({ Icon, title, href, disabled = false }: { Icon: ComponentType, title: string, href: string, disabled?: boolean }) => (
    <Link href={disabled ? href : ""} className={`p-3 aspect-square ${disabled ? "text-gray-500" : "cursor-pointer"}`} title={title} aria-disabled={disabled}>
        <Icon />
    </Link>
);

export const Header = () => {
    const [show_info_popup, setShowInfoPopup] = useState(false);
    const [show_stats_popup, setShowStatsPopup] = useState(false);
    const [show_settings_popup, setShowSettingsPopup] = useState(false);

    useEffect(() => {
        // when ready, show the dialog if not shown before
        if (localStorage.getItem("info_popup_shown") === "true") {
            return;
        }

        setShowInfoPopup(true);
    }, []);

    return (
        <>
            <header className="w-full max-w-3xl mx-auto p-4 flex items-center justify-between">
                <HeaderIconButton Icon={Info} title="Info" on_click={() => setShowInfoPopup(true)} />
                <HeaderIconButton Icon={ChartNoAxesCombined} title="Stats" on_click={() => setShowStatsPopup(true)} />
                <HeaderIconLink Icon={CalendarDays} title="Archive" href="/archive" />

                <h1 className="font-title text-3xl sm:text-4xl mb-1 mx-6 font-bold">Rangle</h1>

                <HeaderIconButton Icon={Settings} title="Settings" on_click={() => setShowSettingsPopup(true)} />
                <HeaderIconButton Icon={Cloud} title="Cloud" on_click={() => alert("Cloud sync is not implemented yet")} disabled />
                <LoginButton />
            </header>

            <InfoPopup open={show_info_popup} on_close={() => {
                setShowInfoPopup(false);
                localStorage.setItem("info_popup_shown", "true");
            }} />
            <StatsPopup open={show_stats_popup} on_close={() => setShowStatsPopup(false)} />
            <SettingsPopup open={show_settings_popup} on_close={() => setShowSettingsPopup(false)} />
        </>
    )
}
