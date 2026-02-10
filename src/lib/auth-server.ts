/**
 * Server-side Authentication Helpers
 * ใช้ตรวจสอบ session และ validate input ใน Server Actions
 */

import { cookies } from 'next/headers';

// ==================== Types ====================

export interface SessionUser {
  user_code: string;
  user_name: string;
  user_level: number;
  provider: string;
  data_group: string;
  selected_database?: string;
  selected_database_name?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user?: SessionUser;
  error?: string;
}

// ==================== Session Validation ====================

/**
 * ตรวจสอบ session จาก cookie
 */
export async function validateSession(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pricechecker_session');
    
    if (!sessionCookie?.value) {
      return { authenticated: false, error: 'Session not found' };
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );

    // ตรวจสอบ session timeout (30 นาที)
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    if (Date.now() - sessionData.lastActivity > SESSION_TIMEOUT_MS) {
      return { authenticated: false, error: 'Session expired' };
    }

    return {
      authenticated: true,
      user: sessionData.user as SessionUser,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { authenticated: false, error: 'Invalid session' };
  }
}

/**
 * ตรวจสอบว่า user มีสิทธิ์เข้าถึง database นี้หรือไม่
 */
export async function validateDatabaseAccess(database: string): Promise<AuthResult> {
  const session = await validateSession();
  
  if (!session.authenticated) {
    return session;
  }

  if (session.user?.selected_database !== database) {
    return { 
      authenticated: false, 
      error: 'Access denied: Invalid database' 
    };
  }

  return session;
}

// ==================== Input Validation ====================

/**
 * Validate และ sanitize search text
 */
export function sanitizeSearchText(text: string, maxLength: number = 100): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.trim().slice(0, maxLength);
}

/**
 * Validate limit parameter
 */
export function validateLimit(limit: number, maxLimit: number = 100): number {
  const num = Math.floor(Number(limit));
  if (isNaN(num) || num < 1) return 20;
  if (num > maxLimit) return maxLimit;
  return num;
}
