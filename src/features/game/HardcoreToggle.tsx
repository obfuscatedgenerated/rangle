"use client";

import {ToggleSwitch} from "@/components/ui/ToggleSwitch";

import {Lock} from "lucide-react";

interface HardcoreToggleProps {
    attempt_count: number;
    hardcore: boolean;
    on_toggle: (hardcore: boolean) => void;
    className?: string;
}

export const HardcoreToggle = ({ attempt_count, hardcore, on_toggle, className = "" }: HardcoreToggleProps) => (
    <ToggleSwitch title="Toggle hardcore mode (locked after first attempt)" value={hardcore} on_toggle={on_toggle} disabled={attempt_count > 0} className={className}>
        Hardcore Mode

        <Lock className={`h-4 w-4 transition-opacity duration-300 ${attempt_count > 0 ? "opacity-100" : "opacity-0"}`} />
    </ToggleSwitch>
);
