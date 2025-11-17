// src/api/auth.ts
import { API_BASE_URL } from '../config/api';

export type SignupPayload = {
    email: string;
    password: string;
    name?: string;   // 👈 make name optional
  };


export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  ok: boolean;
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken?: string;
};

async function handleResponse(res: Response) {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Invalid JSON from server');
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      `Request failed with status ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}
