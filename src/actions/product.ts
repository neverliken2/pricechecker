'use server';

/**
 * Server Actions สำหรับค้นหาสินค้า
 * - barcode และราคาอยู่ในตาราง ic_inventory_barcode
 * - รูปสินค้าอยู่ใน database {database}_images ตาราง images
 */

import { query } from '@/lib/db';
import { validateDatabaseAccess, sanitizeSearchText } from '@/lib/auth-server';

// ==================== Types ====================

export interface BarcodeInfo {
  barcode: string;
  unit_code: string;
  price: number;
  price_2: number;
  price_3: number;
  price_4: number;
}

export interface ProductInfo {
  code: string;
  barcode: string;
  barcodes: BarcodeInfo[];  // รายการ barcode ทั้งหมดพร้อมราคา
  name_1: string;
  name_2: string;
  unit_name: string;
  price: number;       // ราคาหลักจาก barcode ที่ค้นหา
  price_2: number;
  price_3: number;
  price_4: number;
  item_brand: string;
  item_class?: string;  // ประเภท/คลาสสินค้า
  stock_qty: number;
  average_cost: number;
  image_url: string | null;
}

interface BarcodeRow {
  ic_code: string;
  barcode: string;
  unit_code: string;
  price: string;
  price_2: string;
  price_3: string;
  price_4: string;
}

interface ImageRow {
  image_file: Buffer | string;
}

interface InventoryRow {
  code: string;
  name_1: string;
  name_2: string;
  unit_name: string;
  item_brand: string;
  item_class?: string;
  stock_qty: number;
  average_cost: number;
}

// ==================== Types สำหรับ Customer Pricing ====================

export interface CustomerPricingParams {
  icCode: string;
  unitCode: string;
  quantity: string;
  customerCode: string;
  vatType?: 'ภาษีรวมใน' | 'ภาษีแยกนอก' | 'ยกเว้นภาษี' | 'Tax Included' | 'Tax Excluded' | 'Zero Tax';
  saleType?: '0' | '1'; // 0 = ขายเชื่อ, 1 = ขายสด
}

export interface PriceCalculationResult {
  success: boolean;
  price: number;
  price1: number;
  discountPercent: number;
  priceType: string; // 0-10 for which rule matched
  priceMode: string;
  vatType: string;
  debug?: {
    query?: string;
    ruleMatched?: string;
  };
  error?: string;
}

export interface PriceByUnit {
  unitCode: string;
  unitName: string;
  barcode: string;
  pricing: PriceCalculationResult;
}

export interface AllPricesResult {
  success: boolean;
  prices: PriceByUnit[];
  message?: string;
}

interface InventoryPriceRow {
  roworder: string;
  sale_price1: string;
  sale_price2: string;
  price_mode: string;
  price_type: string;
}

interface PriceFormulaRow {
  [key: string]: string; // price_0, price_1, etc.
}

interface DiscountRow {
  roworder?: string;
  discount: string;
}

interface CustomerDetailRow {
  group_main: string;
  group_sub_1: string | null;
  group_sub_2: string | null;
  group_sub_3: string | null;
  group_sub_4: string | null;
  price_level: number;
}

interface TransHistoryRow {
  price_exclude_vat: string;
  price: string;
  vat_type: string;
}

interface ErpOptionRow {
  get_last_price_type: number;
  ic_price_formula_control: number;
}

// ==================== Helper Functions ====================

/**
 * ดึงรูปสินค้าจาก database images
 */
async function getProductImage(database: string, itemCode: string): Promise<string | null> {
  try {
    // Database รูปภาพจะชื่อ {database}_images
    const imageDatabase = `${database}_images`;
    
    const sql = `
      SELECT image_file
      FROM images
      WHERE UPPER(image_id) = UPPER($1)
      LIMIT 1
    `;
    
    const results = await query<ImageRow>(imageDatabase, sql, [itemCode]);
    
    if (results.length > 0 && results[0].image_file) {
      // Convert to base64 data URL (assume jpeg as default)
      const base64 = Buffer.isBuffer(results[0].image_file) 
        ? results[0].image_file.toString('base64')
        : results[0].image_file;
      return `data:image/jpeg;base64,${base64}`;
    }
    
    return null;
  } catch (error) {
    // ถ้าไม่มี database รูปภาพหรือ error อื่นๆ ให้ return null
    console.log('Image database not available or error:', error);
    return null;
  }
}

/**
 * ดึง barcodes ทั้งหมดของสินค้าพร้อมราคา
 */
async function getProductBarcodes(database: string, itemCode: string): Promise<BarcodeInfo[]> {
  try {
    const sql = `
      SELECT 
        barcode,
        COALESCE(unit_code, '') as unit_code,
        COALESCE(price, '0') as price,
        COALESCE(price_2, '0') as price_2,
        COALESCE(price_3, '0') as price_3,
        COALESCE(price_4, '0') as price_4
      FROM ic_inventory_barcode
      WHERE UPPER(ic_code) = UPPER($1)
      ORDER BY barcode
    `;
    
    const results = await query<BarcodeRow>(database, sql, [itemCode]);
    return results.map(r => ({
      barcode: r.barcode,
      unit_code: r.unit_code,
      price: parseFloat(r.price) || 0,
      price_2: parseFloat(r.price_2) || 0,
      price_3: parseFloat(r.price_3) || 0,
      price_4: parseFloat(r.price_4) || 0
    })).filter(b => b.barcode);
  } catch {
    return [];
  }
}

// ==================== Advanced Pricing Functions ====================

/**
 * คำนวณราคาตามสูตרจากสูตรราคา formula
 */
function calculateFormulaPrice(quantity: number, standardPrice: number, formula: string): number {
  if (!formula || formula.trim().length === 0) {
    return standardPrice;
  }

  try {
    // แทนที่ตัวแปรในสูตร
    let calculatedPrice = formula
      .replace(/\{qty\}/gi, quantity.toString())
      .replace(/\{quantity\}/gi, quantity.toString())
      .replace(/\{standard\}/gi, standardPrice.toString())
      .replace(/\{standard_price\}/gi, standardPrice.toString());

    // ประเมินผล (safe eval สำหรับ mathematical expressions)
    // eslint-disable-next-line no-eval
    const result = parseFloat(Function('"use strict"; return (' + calculatedPrice + ')')());
    return isNaN(result) ? standardPrice : result;
  } catch {
    return standardPrice;
  }
}

/**
 * ตรวจสอบว่าวันที่ปัจจุบันอยู่ในช่วง from_date - to_date หรือไม่
 */
function isDateInRange(fromDate: string | null, toDate: string | null): boolean {
  if (!fromDate || !toDate) return true;

  try {
    const today = new Date();
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return today >= from && today <= to;
  } catch {
    return true;
  }
}

/**
 * ตรวจสอบว่าปริมาณอยู่ในช่วง from_qty - to_qty หรือไม่
 */
function isQuantityInRange(quantity: number, fromQty: number | null, toQty: number | null): boolean {
  if (fromQty === null || toQty === null) return true;
  return quantity >= fromQty && quantity <= toQty;
}

/**
 * คำนวณราคาสินค้า (ใช้ราคาจาก barcode เท่านั้น)
 * ระบบราคาแบบง่ายไม่มี fallback
 */
export async function calculateCustomerProductPrice(
  database: string,
  params: CustomerPricingParams
): Promise<PriceCalculationResult> {
  const {
    icCode,
    unitCode,
    vatType = 'ภาษีรวมใน'
  } = params;

  try {
    // ดึงราคาจาก barcode ตามหน่วย
    const barcodePrice = await query<BarcodeRow>(database, `
      SELECT price, price_2, price_3, price_4
      FROM ic_inventory_barcode
      WHERE UPPER(ic_code) = UPPER($1)
        AND UPPER(unit_code) = UPPER($2)
      LIMIT 1
    `, [icCode, unitCode]);

    if (barcodePrice.length > 0) {
      const price = ['ภาษีแยกนอก', 'Tax Excluded'].includes(vatType) 
        ? parseFloat(barcodePrice[0].price)
        : parseFloat(barcodePrice[0].price_2);
      
      return {
        success: true,
        price,
        price1: parseFloat(barcodePrice[0].price),
        discountPercent: 0,
        priceType: '6',
        priceMode: '5',
        vatType,
        debug: { ruleMatched: 'Barcode Price' }
      };
    }

    // ไม่พบราคา
    return {
      success: false,
      price: 0,
      price1: 0,
      discountPercent: 0,
      priceType: '-1',
      priceMode: '0',
      vatType,
      error: 'ไม่พบราคาสินค้า'
    };
  } catch (error) {
    console.error('Calculate product price error:', error);
    return {
      success: false,
      price: 0,
      price1: 0,
      discountPercent: 0,
      priceType: '-1',
      priceMode: '0',
      vatType: params.vatType || 'ภาษีรวมใน',
      error: 'เกิดข้อผิดพลาดในการคำนวณราคา'
    };
  }
}

/**
 * ดึงส่วนลดสำหรับสินค้าตามลูกค้า
 */
export async function getCustomerDiscount(
  database: string,
  icCode: string,
  unitCode: string,
  customerCode: string,
  quantity: number
): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // ส่วนลดตามลูกค้า (discount_type = 2)
    const customerDiscount = await query<DiscountRow>(database, `
      SELECT discount FROM ic_inventory_discount
      WHERE UPPER(ic_code) = UPPER($1)
        AND UPPER(unit_code) = UPPER($2)
        AND UPPER(cust_code) = UPPER($3)
        AND discount_type = 2
        AND $4 BETWEEN from_date AND to_date
        AND $5 BETWEEN from_qty AND to_qty
      ORDER BY line_number
      LIMIT 1
    `, [icCode, unitCode, customerCode, today, quantity]);

    if (customerDiscount.length > 0) {
      return parseFloat(customerDiscount[0].discount) || 0;
    }

    // ส่วนลดตามกลุ่มลูกค้า (discount_type = 1)
    const groupDiscount = await query<DiscountRow>(database, `
      SELECT discount FROM ic_inventory_discount
      WHERE UPPER(ic_code) = UPPER($1)
        AND UPPER(unit_code) = UPPER($2)
        AND cust_group_1 = (SELECT group_main FROM ar_customer_detail WHERE UPPER(ar_code) = UPPER($3) LIMIT 1)
        AND discount_type = 1
        AND $4 BETWEEN from_date AND to_date
        AND $5 BETWEEN from_qty AND to_qty
      ORDER BY roworder
      LIMIT 1
    `, [icCode, unitCode, customerCode, today, quantity]);

    if (groupDiscount.length > 0) {
      return parseFloat(groupDiscount[0].discount) || 0;
    }

    // ส่วนลดทั่วไป (discount_type = 0)
    const generalDiscount = await query<DiscountRow>(database, `
      SELECT discount FROM ic_inventory_discount
      WHERE UPPER(ic_code) = UPPER($1)
        AND UPPER(unit_code) = UPPER($2)
        AND discount_type = 0
        AND $3 BETWEEN from_date AND to_date
        AND $4 BETWEEN from_qty AND to_qty
      LIMIT 1
    `, [icCode, unitCode, today, quantity]);

    if (generalDiscount.length > 0) {
      return parseFloat(generalDiscount[0].discount) || 0;
    }

    return 0;
  } catch (error) {
    console.error('Get customer discount error:', error);
    return 0;
  }
}

/**
 * คำนวณราคาสำหรับทุก unit_code ของสินค้า
 * เอา barcodes ทั้งหมดมาหาราคาแยกตามหน่วย
 */
export async function calculateAllPricesByUnits(
  database: string,
  icCode: string,
  barcodes: BarcodeInfo[],
  customerCode: string = '',
  vatType: string = 'ภาษีรวมใน'
): Promise<AllPricesResult> {
  if (!barcodes || barcodes.length === 0) {
    return {
      success: false,
      prices: [],
      message: 'ไม่มีบาร์โค้ดสำหรับสินค้านี้'
    };
  }

  try {
    const priceResults: PriceByUnit[] = [];

    // หาราคาสำหรับแต่ละหน่วย
    for (const barcode of barcodes) {
      if (!barcode.unit_code) continue;

      // ใช้ราคาจาก barcode โดยตรง (ไม่ query ใหม่)
      // Fallback chain: price_2 → price → price1
      let basePrice = 0;
      
      // เลือกราคา exclude VAT ก่อน
      if (barcode.price > 0) {
        basePrice = barcode.price;
      } else if (barcode.price_2 > 0) {
        basePrice = barcode.price_2 / 1.07;
      } else if (barcode.price_3 > 0) {
        basePrice = barcode.price_3 / 1.07;
      } else if (barcode.price_4 > 0) {
        basePrice = barcode.price_4 / 1.07;
      }

      // คำนวณให้เป็น include/exclude VAT ตามที่ต้องการ
      let price = basePrice;
      if (vatType !== 'ภาษีแยกนอก' && vatType !== 'Tax Excluded') {
        // ถ้าต้อง include VAT
        price = basePrice * 1.07;
      }

      const pricing: PriceCalculationResult = {
        success: basePrice > 0,
        price,
        price1: basePrice,
        discountPercent: 0,
        priceType: '6',
        priceMode: '5',
        vatType,
        debug: { ruleMatched: 'Direct Barcode Price' }
      };

      priceResults.push({
        unitCode: barcode.unit_code,
        unitName: barcode.unit_code,
        barcode: barcode.barcode,
        pricing
      });
    }

    return {
      success: priceResults.length > 0,
      prices: priceResults,
      message: priceResults.length > 0 ? `เจอราคา ${priceResults.length} หน่วย` : 'ไม่พบราคา'
    };
  } catch (error) {
    console.error('Calculate all prices by units error:', error);
    return {
      success: false,
      prices: [],
      message: 'เกิดข้อผิดพลาดในการคำนวณราคา'
    };
  }
}

// ==================== Actions ====================

/**
 * ค้นหาสินค้าจาก barcode หรือ code
 */
export async function searchProductByBarcode(
  database: string,
  barcode: string
): Promise<{ success: boolean; data: ProductInfo | null; message?: string }> {
  // ตรวจสอบ session และสิทธิ์
  const auth = await validateDatabaseAccess(database);
  if (!auth.authenticated) {
    return { success: false, data: null, message: auth.error || 'Unauthorized' };
  }

  try {
    const safeBarcode = sanitizeSearchText(barcode, 50);
    
    if (!safeBarcode) {
      return { success: false, data: null, message: 'กรุณาระบุบาร์โค้ด' };
    }

    // ค้นหา ic_code และราคาจาก barcode (ตาราง ic_inventory_barcode)
    const barcodeSearch = await query<BarcodeRow>(
      database,
      `SELECT 
        ic_code, 
        barcode,
        COALESCE(unit_code, '') as unit_code,
        COALESCE(price, '0') as price,
        COALESCE(price_2, '0') as price_2,
        COALESCE(price_3, '0') as price_3,
        COALESCE(price_4, '0') as price_4
       FROM ic_inventory_barcode 
       WHERE UPPER(barcode) = UPPER($1)
       LIMIT 1`,
      [safeBarcode]
    );

    let itemCode = safeBarcode;
    let foundBarcode: BarcodeInfo | null = null;

    if (barcodeSearch.length > 0) {
      itemCode = barcodeSearch[0].ic_code;
      foundBarcode = {
        barcode: barcodeSearch[0].barcode,
        unit_code: barcodeSearch[0].unit_code,
        price: parseFloat(barcodeSearch[0].price) || 0,
        price_2: parseFloat(barcodeSearch[0].price_2) || 0,
        price_3: parseFloat(barcodeSearch[0].price_3) || 0,
        price_4: parseFloat(barcodeSearch[0].price_4) || 0
      };
    }

    // Query product by code
    const sql = `
      SELECT 
        code,
        COALESCE(name_1, '') as name_1,
        COALESCE(name_2, '') as name_2,
        COALESCE(unit_cost, '') as unit_name,
        COALESCE(item_brand, '') as item_brand,
        COALESCE(item_class, '') as item_class,
        COALESCE(balance_qty, 0)::numeric as stock_qty,
        COALESCE(average_cost, '0')::numeric as average_cost
      FROM ic_inventory
      WHERE UPPER(code) = UPPER($1)
      AND item_type <> 5
      LIMIT 1
    `;

    const results = await query<InventoryRow>(
      database, 
      sql, 
      [itemCode]
    );

    if (results.length === 0) {
      return { success: false, data: null, message: 'ไม่พบสินค้า' };
    }

    const product = results[0];

    // ดึง barcodes และ image
    let barcodes = await getProductBarcodes(database, product.code);
    const imageUrl = await getProductImage(database, product.code);

    // ถ้าไม่มี barcode record → สร้าง default จากตาราง ic_inventory
    if (barcodes.length === 0) {
      console.log('📦 No barcodes found, creating default from ic_inventory');
      // ใช้ unit_name จาก ic_inventory เป็น unit_code
      const unitCode = product.unit_name || 'PIECE';
      
      // สร้าง default barcode info โดยใช้ product code เป็น barcode
      barcodes = [{
        barcode: product.code,
        unit_code: unitCode,
        price: foundBarcode?.price || 0,
        price_2: foundBarcode?.price_2 || 0,
        price_3: foundBarcode?.price_3 || 0,
        price_4: foundBarcode?.price_4 || 0
      }];
    }

    // ใช้ราคาจาก barcode ที่ค้นหา หรือ barcode แรก
    const priceSource = foundBarcode || barcodes[0] || { price: 0, price_2: 0, price_3: 0, price_4: 0 };

    return { 
      success: true, 
      data: {
        ...product,
        barcode: foundBarcode?.barcode || barcodes[0]?.barcode || '',
        barcodes,
        price: priceSource.price,
        price_2: priceSource.price_2,
        price_3: priceSource.price_3,
        price_4: priceSource.price_4,
        image_url: imageUrl
      }
    };
  } catch (error) {
    console.error('Search product error:', error);
    return { success: false, data: null, message: 'เกิดข้อผิดพลาดในการค้นหา' };
  }
}

/**
 * ค้นหาสินค้าแบบ fuzzy (search by name, code, barcode)
 */
export async function searchProducts(
  database: string,
  search: string,
  limit: number = 10
): Promise<{ success: boolean; data: ProductInfo[]; message?: string }> {
  const auth = await validateDatabaseAccess(database);
  if (!auth.authenticated) {
    return { success: false, data: [], message: auth.error || 'Unauthorized' };
  }

  try {
    const safeSearch = sanitizeSearchText(search, 100);
    const safeLimit = Math.min(Math.max(1, limit), 50);

    if (!safeSearch) {
      return { success: false, data: [], message: 'กรุณาระบุคำค้นหา' };
    }

    // ค้นหาจาก barcode table ก่อน
    const barcodeMatches = await query<BarcodeRow>(
      database,
      `SELECT DISTINCT 
        ic_code, 
        barcode,
        COALESCE(unit_code, '') as unit_code,
        COALESCE(price, '0') as price,
        COALESCE(price_2, '0') as price_2,
        COALESCE(price_3, '0') as price_3,
        COALESCE(price_4, '0') as price_4
       FROM ic_inventory_barcode
       WHERE barcode ILIKE $1
       LIMIT $2`,
      [`%${safeSearch}%`, safeLimit]
    );

    const barcodeItemCodes = barcodeMatches.map(b => b.ic_code);

    // สร้าง query สำหรับค้นหาสินค้า
    let sql: string;
    let params: (string | number)[];

    if (barcodeItemCodes.length > 0) {
      // ค้นหาจากทั้ง code/name และ barcode matches
      const placeholders = barcodeItemCodes.map((_, i) => `$${i + 3}`).join(',');
      sql = `
        SELECT DISTINCT
          code,
          COALESCE(name_1, '') as name_1,
          COALESCE(name_2, '') as name_2,
          COALESCE(unit_cost, '') as unit_name,
          COALESCE(item_brand, '') as item_brand,
          COALESCE(item_class, '') as item_class,
          COALESCE(balance_qty, 0)::numeric as stock_qty,
          COALESCE(average_cost, '0')::numeric as average_cost
        FROM ic_inventory
        WHERE (
          code ILIKE $1 
          OR name_1 ILIKE $1 
          OR UPPER(code) IN (${placeholders})
        )
        AND item_type <> 5
        ORDER BY 
          CASE 
            WHEN UPPER(code) = UPPER($2) THEN 0
            ELSE 1 
          END,
          code
        LIMIT ${safeLimit}
      `;
      params = [`%${safeSearch}%`, safeSearch, ...barcodeItemCodes.map(c => c.toUpperCase())];
    } else {
      // ค้นหาจาก code/name เท่านั้น
      sql = `
        SELECT 
          code,
          COALESCE(name_1, '') as name_1,
          COALESCE(name_2, '') as name_2,
          COALESCE(unit_cost, '') as unit_name,
          COALESCE(item_brand, '') as item_brand,
          COALESCE(item_class, '') as item_class,
          COALESCE(balance_qty, 0)::numeric as stock_qty,
          COALESCE(average_cost, '0')::numeric as average_cost
        FROM ic_inventory
        WHERE (
          code ILIKE $1 
          OR name_1 ILIKE $1
        )
        AND item_type <> 5
        ORDER BY 
          CASE 
            WHEN UPPER(code) = UPPER($2) THEN 0
            ELSE 1 
          END,
          code
        LIMIT $3
      `;
      params = [`%${safeSearch}%`, safeSearch, safeLimit];
    }

    const results = await query<InventoryRow>(
      database, 
      sql, 
      params
    );

    // เพิ่ม barcode และราคาให้แต่ละสินค้า
    const productsWithDetails = await Promise.all(
      results.map(async (product) => {
        const barcodes = await getProductBarcodes(database, product.code);
        // หา barcode ที่ตรงกับการค้นหา
        const matchedBarcode = barcodeMatches.find(b => 
          b.ic_code.toUpperCase() === product.code.toUpperCase()
        );
        
        const priceSource = matchedBarcode 
          ? {
              price: parseFloat(matchedBarcode.price) || 0,
              price_2: parseFloat(matchedBarcode.price_2) || 0,
              price_3: parseFloat(matchedBarcode.price_3) || 0,
              price_4: parseFloat(matchedBarcode.price_4) || 0
            }
          : (barcodes[0] || { price: 0, price_2: 0, price_3: 0, price_4: 0 });
        
        return {
          ...product,
          barcode: matchedBarcode?.barcode || barcodes[0]?.barcode || '',
          barcodes,
          price: priceSource.price,
          price_2: priceSource.price_2,
          price_3: priceSource.price_3,
          price_4: priceSource.price_4,
          image_url: null as string | null // ไม่โหลดรูปในผลการค้นหา เพื่อความเร็ว
        };
      })
    );

    return { success: true, data: productsWithDetails };
  } catch (error) {
    console.error('Search products error:', error);
    return { success: false, data: [], message: 'เกิดข้อผิดพลาดในการค้นหา' };
  }
}
