const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
}

const buildUrl = (path: string, query?: RequestOptions["query"]) => {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

const getAuthToken = () => localStorage.getItem("pm_access_token");

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { query, auth, headers, body, ...rest } = options;
  const url = buildUrl(path, query);
  const init: RequestInit = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    ...rest,
  };

  if (auth) {
    const token = getAuthToken();
    if (token) {
      (init.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  if (body && typeof body !== "string" && !(body instanceof FormData)) {
    init.body = JSON.stringify(body);
  } else if (body) {
    init.body = body as BodyInit;
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
};

export const apiGet = <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, options);
export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>(path, { method: "POST", body, ...options });
export const apiPatch = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>(path, { method: "PATCH", body, ...options });
