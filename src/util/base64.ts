export const safe_btoa = (str: string) => {
    const bytes = new TextEncoder().encode(str);
    const bin_str = Array.from(bytes).map(b => String.fromCharCode(b)).join("");
    return btoa(bin_str);
}

export const safe_atob = (b64: string) => {
    const bin_str = atob(b64);
    const bytes = Uint8Array.from(bin_str.split("").map(c => c.charCodeAt(0)));
    return new TextDecoder().decode(bytes);
}
