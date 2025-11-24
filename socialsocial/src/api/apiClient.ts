// FILE: socialsocial/src/api/apiClient.ts

import axios, { AxiosError, AxiosInstance } from 'axios';

/**
 * בסיס לכתובת ה־API.
 * חשוב: ודא שיש לך משתנה סביבה כזה:
 * EXPO_PUBLIC_API_BASE_URL
 * לדוגמה: "http://localhost:3000"
 *
 * באקספו 54 זה נגיש כ-process.env.EXPO_PUBLIC_API_BASE_URL
 */
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseURL) {
  // זה יעזור לך לזהות מהר אם שכחת להגדיר את ה-URL
  // ולא תישאר עם שגיאות רשת מעצבנות בלי להבין למה.
  // אתה יכול להחליש או להסיר את ה-throw אם זה מפריע.
  // eslint-disable-next-line no-console
  console.warn(
    '[apiClient] Missing EXPO_PUBLIC_API_BASE_URL – set it in your .env / app.config'
  );
}

const api: AxiosInstance = axios.create({
  baseURL: baseURL ?? 'http://localhost:3000', // fallback ידידותי
  timeout: 15000,
});

// מחזיקים callback אחד גלובלי במקרה של 401
let onAuthLostCallback: (() => void) | null = null;

/**
 * מגדיר callback שמופעל כשאנחנו מקבלים 401 מהבקאנד.
 * לדוגמה: לנווט למסך Login ולנקות טוקנים.
 */
export const setOnAuthLost = (cb: (() => void) | null) => {
  onAuthLostCallback = cb;
};

/**
 * מגדיר / מנקה את Authorization Header ברמת כל ה־client.
 * קרא לזה אחרי login / logout / auto-login.
 */
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Interceptor עבור תגובות – נתפוס 401 במקום אחד מרוכז
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401 && onAuthLostCallback) {
      // מאבדים הרשאה → מפעילים callback (הוצאת המשתמש מהאפליקציה למשל)
      onAuthLostCallback();
    }

    return Promise.reject(error);
  }
);

export default api;
