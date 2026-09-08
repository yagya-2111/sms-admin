const ADMIN_STORAGE_KEY = "skypay_admin_email";
const ADMIN_SESSION_KEY = "skypay_admin_session";

export function getAdminEmails(): string[] {
  const fromEnv = import.meta.env.VITE_ADMIN_EMAIL || "admin@gmail.com";
  return fromEnv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function getStoredAdminEmail(): string | null {
  try {
    return localStorage.getItem(ADMIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminSession(email: string) {
  const value = email.trim().toLowerCase();
  localStorage.setItem(ADMIN_STORAGE_KEY, value);
  localStorage.setItem(ADMIN_SESSION_KEY, "1");
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function hasAdminAccess(): boolean {
  try {
    const stored = getStoredAdminEmail();
    if (!stored) return false;

    if (localStorage.getItem(ADMIN_SESSION_KEY) === "1") {
      return true;
    }

    // Keep older email-only sessions logged in across refresh.
    if (isAdminEmail(stored)) {
      localStorage.setItem(ADMIN_SESSION_KEY, "1");
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
