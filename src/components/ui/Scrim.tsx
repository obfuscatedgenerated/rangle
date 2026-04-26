export const Scrim = ({className = "", onClick}: { className?: string, onClick?: () => void }) => (
    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm z-999 ${className}`} onClick={onClick} />
);
