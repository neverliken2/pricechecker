/**
 * API Route: /api/pricing
 * 
 * ตัวอย่างการใช้งาน Advanced Customer Pricing Functions
 * เรียกใช้ POST request พร้อม body JSON:
 * 
 * POST /api/pricing
 * {
 *   "database": "your_database",
 *   "icCode": "P001",
 *   "unitCode": "PIECE",
 *   "quantity": "10",
 *   "customerCode": "CUST001",
 *   "vatType": "ภาษีรวมใน",
 *   "saleType": "0"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateCustomerProductPrice, getCustomerDiscount } from '@/actions/product';
import { validateDatabaseAccess } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      database,
      icCode,
      unitCode,
      quantity,
      customerCode,
      vatType = 'ภาษีรวมใน',
      saleType = '0'
    } = body;

    // ตรวจสอบ input
    if (!database || !icCode || !unitCode || !quantity || !customerCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: database, icCode, unitCode, quantity, customerCode' 
        },
        { status: 400 }
      );
    }

    // ตรวจสอบการเข้าถึง database
    const auth = await validateDatabaseAccess(database);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // ======== ดึงราคา ========
    const pricingResult = await calculateCustomerProductPrice(database, {
      icCode,
      unitCode,
      quantity,
      customerCode,
      vatType,
      saleType
    });

    if (!pricingResult.success) {
      return NextResponse.json(
        { success: false, error: pricingResult.error },
        { status: 404 }
      );
    }

    // ======== ดึงส่วนลด ========
    const discount = await getCustomerDiscount(
      database,
      icCode,
      unitCode,
      customerCode,
      parseInt(quantity) || 1
    );

    // ======== คำนวณราคาสุดท้าย ========
    const basePrice = pricingResult.price;
    const discountAmount = (basePrice * discount) / 100;
    const finalPrice = basePrice - discountAmount;

    return NextResponse.json({
      success: true,
      data: {
        // ข้อมูลราคา
        basePrice,
        discount,
        discountAmount,
        finalPrice,
        
        // ข้อมูล debug
        priceType: pricingResult.priceType,
        priceMode: pricingResult.priceMode,
        vatType: pricingResult.vatType,
        debug: pricingResult.debug
      }
    });
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
