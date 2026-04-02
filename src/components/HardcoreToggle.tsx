"use client";

interface HardcoreToggleProps {
    attempt_count: number;
    hardcore: boolean;
    on_toggle: (hardcore: boolean) => void;
    className?: string;
}

export const HardcoreToggle = ({ attempt_count, hardcore, on_toggle, className = "" }: HardcoreToggleProps) => {
    const handle_toggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        on_toggle(e.target.checked);
    };

    return (
        <label className={`flex items-center space-x-2 ${className}`}>
            <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 sr-only peer"
                disabled={attempt_count > 0}
                onChange={handle_toggle}
                checked={hardcore}
                title="Toggle hardcore mode (locked after first attempt)"
            />
            <div aria-hidden="true" title="Toggle hardcore mode (locked after first attempt)" className="cursor-pointer peer-disabled:cursor-not-allowed relative w-9 h-5 bg-gray-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-buffer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span className={`text-sm ${attempt_count > 0 ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                Hardcore Mode {attempt_count > 0 ? "🔒" : "🔓"}
            </span>
        </label>
    );
}
