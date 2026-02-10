'use server';

/**
 * Server Actions สำหรับ Authentication
 */

import { getLoginPool } from '@/lib/db';
import { createSession } from './session';

// ==================== Types ====================

export interface LoginResult {
  success: boolean;
  message: string;
  user?: {
    user_code: string;
    user_name: string;
    user_level: number;
  };
  databases?: {
    code: string;
    database_name: string;
    name: string;
  }[];
}

// ==================== Validation ====================

function validateLoginInput(provider: string, username: string, password: string): string | null {
  if (!provider || typeof provider !== 'string') {
    return 'กรุณาระบุ Provider';
  }
  if (!username || typeof username !== 'string') {
    return 'กรุณาระบุ Username';
  }
  if (!password || typeof password !== 'string') {
    return 'กรุณาระบุ Password';
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(provider) || provider.length > 20) {
    return 'Provider ไม่ถูกต้อง';
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username) || username.length > 50) {
    return 'Username ไม่ถูกต้อง';
  }
  
  return null;
}

// ==================== Actions ====================

/**
 * Login และสร้าง session
 */
export async function loginUser(
  provider: string,
  dataGroup: string,
  username: string,
  password: string
): Promise<LoginResult> {
  const validationError = validateLoginInput(provider, username, password);
  if (validationError) {
    return { success: false, message: validationError };
  }

  try {
    const pool = getLoginPool(provider);
    const client = await pool.connect();

    try {
      // Query user
      const userResult = await client.query(
        `SELECT user_code, user_name, user_password, user_level 
         FROM sml_user_list 
         WHERE UPPER(user_code) = UPPER($1)`,
        [username]
      );

      if (userResult.rows.length === 0) {
        return { success: false, message: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
      }

      const user = userResult.rows[0];

      if (user.user_password !== password) {
        return { success: false, message: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
      }

      // Get available databases
      const effectiveDataGroup = dataGroup || 'SML';
      const databaseResult = await client.query(
        `SELECT data_code as code, data_database_name as database_name, data_name as name 
         FROM sml_database_list 
         WHERE UPPER(data_group) = UPPER($1) 
         ORDER BY data_code`,
        [effectiveDataGroup]
      );

      const databases = databaseResult.rows as {
        code: string;
        database_name: string;
        name: string;
      }[];

      // Create session
      await createSession(
        {
          user_code: user.user_code,
          user_name: user.user_name,
          user_level: user.user_level || 0,
          provider,
          data_group: effectiveDataGroup,
        },
        databases
      );

      return {
        success: true,
        message: 'Login successful',
        user: {
          user_code: user.user_code,
          user_name: user.user_name,
          user_level: user.user_level || 0,
        },
        databases,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      return { success: false, message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้' };
    }
    
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
  }
}
