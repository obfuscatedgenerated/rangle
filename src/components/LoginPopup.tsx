import {useAuth} from "@/context/AuthContext";
import {useEffect, useRef, useState} from "react";

interface LoginPopupProps {
    open: boolean;
    on_close: () => void;
}

export const LoginPopup = ({open, on_close}: LoginPopupProps) => {
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

                    <br />

                    <p className="mb-4 text-pretty text-center">Cloud sync is in beta and may have bugs. There is the risk that your local or cloud data may be corrupted or lost. A backup is automatically kept, but you agree regardless that you might lose progress.</p>

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
