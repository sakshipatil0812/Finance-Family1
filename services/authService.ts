const USER_KEY = 'financelyai_user';
const SESSION_KEY = 'financelyai_session';

// Hashing function using Web Crypto API
const hashPassword = async (password: string, salt: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const signUp = async (name: string, pass: string): Promise<boolean> => {
    if (localStorage.getItem(USER_KEY)) {
        return false; // User already exists
    }
    const salt = crypto.randomUUID();
    const hash = await hashPassword(pass, salt);
    const userData = { name, salt, hash };
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    localStorage.setItem(SESSION_KEY, 'true');
    return true;
};

export const login = async (pass: string): Promise<boolean> => {
    const userDataString = localStorage.getItem(USER_KEY);
    if (!userDataString) {
        return false; // No user exists
    }
    const { salt, hash: storedHash } = JSON.parse(userDataString);
    const inputHash = await hashPassword(pass, salt);
    if (inputHash === storedHash) {
        localStorage.setItem(SESSION_KEY, 'true');
        return true;
    }
    return false;
};

export const logout = (): void => {
    localStorage.removeItem(SESSION_KEY);
};

export const doesAccountExist = async (): Promise<boolean> => {
    return !!localStorage.getItem(USER_KEY);
};

export const checkAuth = async (): Promise<boolean> => {
    return localStorage.getItem(SESSION_KEY) === 'true';
}

export const getAuthenticatedUser = (): { name: string } | null => {
    const userDataString = localStorage.getItem(USER_KEY);
    if (!userDataString) return null;
    return { name: JSON.parse(userDataString).name };
};
