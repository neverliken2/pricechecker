'use server';

/**
 * Server Actions สำหรับ Session Management
 */

import { cookies } from 'next/headers';

interface SessionData {
  user: {
    user_code: string;
    user_name: string;
    user_level: number;
    provider: string;
    data_group: string;
    selected_database?: string;
    selected_database_name?: string;
  };
  lastActivity: number;
  availableDatabases: string[];
}

/**
 * Helper function เพื่อกำหนด cookie options
 */
function getCookieOptions() {
  const forceInsecure = process.env.COOKIE_SECURE === 'false';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction && !forceInsecure,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  };
}

/**
 * สร้าง session หลัง login สำเร็จ
 */
export async function createSession(
  user: SessionData['user'],
  availableDatabases: { code: string; database_name: string; name: string }[]
): Promise<{ success: boolean }> {
  try {
    const sessionData: SessionData = {
      user,
      lastActivity: Date.now(),
      availableDatabases: availableDatabases.map(db => db.database_name),
    };

    const sessionValue = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    const cookieStore = await cookies();
    cookieStore.set('pricechecker_session', sessionValue, getCookieOptions());
    
    console.log('[Session] Created session for user:', user.user_code);

    return { success: true };
  } catch (error) {
    console.error('Create session error:', error);
    return { success: false };
  }
}

/**
 * อัพเดท session เมื่อเลือก database
 */
export async function updateSessionDatabase(
  selectedDatabase: string,
  selectedDatabaseName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pricechecker_session');
    
    if (!sessionCookie?.value) {
      return { success: false, error: 'Session not found' };
    }

    const sessionData: SessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );

    // ตรวจสอบว่า database อยู่ใน allowed list หรือไม่
    if (!sessionData.availableDatabases.includes(selectedDatabase)) {
      return { success: false, error: 'Access denied: Invalid database' };
    }

    // อัพเดท session
    sessionData.user.selected_database = selectedDatabase;
    sessionData.user.selected_database_name = selectedDatabaseName;
    sessionData.lastActivity = Date.now();

    const sessionValue = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    cookieStore.set('pricechecker_session', sessionValue, getCookieOptions());
    
    console.log('[Session] Updated database selection:', selectedDatabase);

    return { success: true };
  } catch (error) {
    console.error('Update session error:', error);
    return { success: false, error: 'Failed to update session' };
  }
}

/**
 * ลบ session (logout)
 */
export async function destroySession(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('pricechecker_session');
    console.log('[Session] Destroyed session');
    return { success: true };
  } catch (error) {
    console.error('Destroy session error:', error);
    return { success: false };
  }
}

/**
 * ดึงข้อมูล session ปัจจุบัน
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pricechecker_session');
    
    if (!sessionCookie?.value) {
      return null;
    }

    return JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );
  } catch {
    return null;
  }
}
