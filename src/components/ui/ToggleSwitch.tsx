"use client";

interface ToggleSwitchProps {
    value: boolean;
    on_toggle: (new_value: boolean) => void;
    children?: React.ReactNode;
    title?: string;
    disabled?: boolean;
    className?: string;
}

export const ToggleSwitch = ({ value, on_toggle, children, title, disabled = false, className = "" }: ToggleSwitchProps) => {
    const handle_toggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        on_toggle(e.target.checked);
    };

    return (
        <label className={`flex items-center space-x-2 ${className}`}>
            <input
                type="checkbox"
                className="h-5 w-5 sr-only peer"
                disabled={disabled}
                onChange={handle_toggle}
                checked={value}
                title={title}
            />
            <div aria-hidden="true" title={title} className="cursor-pointer peer-disabled:cursor-not-allowed relative w-9 h-5 bg-tertiary-background rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-buffer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-handle after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-disabled:opacity-75" />
            <span className="text-sm transition-colors duration-300 text-muted-foreground peer-disabled:text-disabled flex items-center gap-2">
                {children}
            </span>
        </label>
    );
}
