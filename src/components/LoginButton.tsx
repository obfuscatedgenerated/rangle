"use client";

import {CircleUserRound} from "lucide-react";
import {LoadingSpinner} from "@/components/LoadingSpinner";

import {useAuth} from "@/context/AuthContext";
import {useEffect, useRef, useState} from "react";

interface LoginPopupProps {
    open: boolean;
    on_close: () => void;
}

const LoginPopup = ({open, on_close}: LoginPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);
    const {login_url} = useAuth();

    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    const [disclaimer_shown, setDisclaimerShown] = useState(false);

    return (
        <dialog onAbort={on_close} ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Log in</h2>

            {!disclaimer_shown && (
                <>
                    <p className="mb-4 text-pretty text-center">Cloud sync is only available to invited users. Logging in does not guarantee access to cloud sync.</p>
                    <p className="mb-4 text-pretty text-center">By logging in, you agree to the ollieg.codes <a href="https://ollieg.codes/privacy" target="_blank" rel="noreferrer noopener" className="underline">Privacy Policy</a>.</p>

                    <div className="flex gap-4 flex-row-reverse">
                        <button
                            className="mt-2 px-4 py-2 bg-primary text-on-primary rounded cursor-pointer"
                            onClick={() => setDisclaimerShown(true)}
                        >
                            I agree
                        </button>

                        <button
                            className="mt-2 px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                            onClick={on_close}
                        >
                            Cancel
                        </button>
                    </div>
                </>
            )}

            {disclaimer_shown && (
                <>
                    <iframe className="w-full h-70 rounded-lg" src={login_url}></iframe>

                    <button
                        className="mt-2 px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                        onClick={on_close}
                    >
                        Cancel
                    </button>
                </>
            )}
        </dialog>
    );
}

export const LoginButton = ({className = ""}: { className?: string }) => {
    const {user_info, auth_origin, logout} = useAuth();

    const [show_login_popup, setShowLoginPopup] = useState(false);

    return (
        <>
            <LoginPopup open={show_login_popup} on_close={() => setShowLoginPopup(false)} />

            <div className={`ml-4 flex items-center justify-center ${className}`}>
                {user_info ?
                    // TODO: this will be a proper menu later. for now just logout
                    <button onClick={logout} title="Logout" className="cursor-pointer aspect-square w-8 h-8">
                        <img src={user_info?.avatar} className="w-full h-full rounded-full" title={user_info.username} draggable="false" alt="User Avatar" />
                    </button>
                    : auth_origin ? (
                        <button onClick={() => setShowLoginPopup(true)} className="cursor-pointer aspect-square w-8 h-8 flex items-center justify-center" title="Login">
                            <CircleUserRound />
                        </button>
                    )
                    : <LoadingSpinner />
                }
            </div>
        </>
    );
}
