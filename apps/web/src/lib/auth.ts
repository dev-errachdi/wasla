export const TOKEN_KEY = "wasla_token";
export const USER_KEY = "wasla_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `wasla_token=${token}; path=/; max-age=${60 * 60 * 24}`;
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function setUser(user: object): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = "wasla_token=; path=/; max-age=0";
  window.location.href = "/login";
}

export function isLoggedIn(): boolean {
  return !!getToken();
}