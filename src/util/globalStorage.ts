export class GlobalStorage {
    app_id: string;
    base_url: string;

    /**
     * @param app_id - Unique ID for the app
     * @param base_url - The URL of the storage worker (defaults to cloud.ollieg.codes)
     */
    constructor(app_id: string, base_url: string = "https://cloud.ollieg.codes") {
        if (!app_id) {
            throw new Error("GlobalStorage: app_id is required");
        }

        this.app_id = app_id;
        this.base_url = base_url.replace(/\/$/, "");
    }

    async _request(path: string, options: RequestInit = {}) {
        const url = `${this.base_url}${path}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                "Accept": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("sso_token")}`
            },
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            const error_text = await response.text().catch(() => "Unknown Error");
            throw new Error(`GlobalStorage: ${response.status} - ${error_text}`);
        }

        return response;
    }

    async getItem(key: string): Promise<string | null> {
        const res = await this._request(`/globalStorage/${this.app_id}/${encodeURIComponent(key)}`);
        if (!res) {
            return null;
        }

        return await res.json();
    }

    async setItem(key: string, value: string): Promise<void> {
        await this._request(`/globalStorage/${this.app_id}/${encodeURIComponent(key)}`, {
            method: "PUT",
            headers: { "Content-Type": "text/plain" },
            body: value
        });
    }

    async removeItem(key: string): Promise<void> {
        await this._request(`/globalStorage/${this.app_id}/${encodeURIComponent(key)}`, {
            method: "DELETE"
        });
    }

    async clear(): Promise<void> {
        await this._request(`/globalStorage/${this.app_id}`, {
            method: "DELETE"
        });
    }
}
