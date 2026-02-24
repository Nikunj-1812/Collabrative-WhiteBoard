const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
}

export const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

export const getAuthUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const setAuthSession = (token: string, user: AuthUser) => {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  // Clear sensitive data from sessionStorage if any
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("user_name");
  }
};

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    try {
      const data = await response.json();
      throw new Error(data.error || `Request failed: ${response.status}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Unexpected token")) {
        throw new Error(`Request failed: ${response.status}`);
      }
      throw err;
    }
  }

  if (response.status === 204) return null;
  return response.json();
};
