"use client";

import InfoPopup from "@/components/InfoPopup";

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
    <Link href={!disabled ? href : ""} className={`p-3 aspect-square ${disabled ? "text-gray-500 cursor-auto" : ""}`} title={title} aria-disabled={disabled}>
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
            <header className="w-full flex items-center justify-center p-3 sm:p-4">
                <div className="sm:mr-32"></div>

                <div className="w-full max-w-3xl flex items-center justify-between">
                    <HeaderIconButton Icon={Info} title="Info" on_click={() => setShowInfoPopup(true)} />
                    <HeaderIconButton Icon={ChartNoAxesCombined} title="Stats" on_click={() => setShowStatsPopup(true)} />

                    <h1 className="font-title text-3xl sm:text-4xl mb-1 mx-4 sm:mx-6 font-bold">Rangle</h1>

                    <HeaderIconLink Icon={CalendarDays} title="Archive" href="/archive" />
                    <HeaderIconButton Icon={Settings} title="Settings" on_click={() => setShowSettingsPopup(true)} />
                </div>

                <LoginButton className="sm:ml-32" />
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
