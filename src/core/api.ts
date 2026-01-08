export interface FetchOptions extends RequestInit {
    timeout?: number;
    retries?: number;
    backoff?: number;
}

export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
    const {
        timeout = 15000,
        retries = 2,
        backoff = 1000,
        ...fetchOptions
    } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });

        clearTimeout(id);

        // Throw for 5xx errors to trigger retry, return 4xx to caller (client error)
        if (!response.ok && response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
        }

        return response;
    } catch (error: any) {
        clearTimeout(id);

        if (retries > 0) {
            // Don't retry if manually aborted (timeout) unless we strictly want to, 
            // usually timeout means backend is slow/dead, retry might help if it was a blip, 
            // but often we want to fail fast after one long timeout. 
            // Let's retry on network errors, not necessarily timeouts if they are long.
            // For this implementation, we retry connectivity errors.

            console.warn(`Fetch failed, retrying in ${backoff}ms... (${retries} left)`, error);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, {
                ...options,
                retries: retries - 1,
                backoff: backoff * 2
            });
        }

        throw error;
    }
}
