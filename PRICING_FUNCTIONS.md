# Advanced Customer Pricing Functions

## Overview

ฟังชั่นระดับสูงสำหรับการคำนวณราคาสินค้าที่คำนึงถึงลูกค้า (customer-specific pricing) พร้อมการค้นหาหลายระดับตามลำดับความสำคัญ อิงตามข้อมูล Java function `getProductPriceLocalx`

## ฟังชั่นหลัก

### 1. `calculateCustomerProductPrice()`

คำนวณราคาสินค้าตามลูกค้าผ่านระบบ fallback ที่ซับซ้อน

**ตำแหน่ง:** `src/actions/product.ts`

**Signature:**
```typescript
export async function calculateCustomerProductPrice(
  database: string,
  params: CustomerPricingParams
): Promise<PriceCalculationResult>
```

**Parameters:**
```typescript
interface CustomerPricingParams {
  icCode: string;          // รหัสสินค้า (Product Code)
  unitCode: string;        // รหัสหน่วย (Unit Code - เช่น PIECE, BOX)
  quantity: string;        // จำนวน (สตริง, จะแปลงเป็น number)
  customerCode: string;    // รหัสลูกค้า (Customer Code)
  vatType?: string;        // ประเภท VAT: 'ภาษีรวมใน' | 'ภาษีแยกนอก' | 'ยกเว้นภาษี'
  saleType?: string;       // ประเภทการขาย: '0' (เชื่อ) | '1' (สด)
}
```

**Return Value:**
```typescript
interface PriceCalculationResult {
  success: boolean;        // สำเร็จหรือไม่
  price: number;          // ราคาที่คำนวณ (ราคาหลัก)
  price1: number;         // ราคา exclude VAT
  discountPercent: number; // ส่วนลด (%)
  priceType: string;      // ประเภทราคาที่พบ (0-7 หรือ -1 หากไม่พบ)
  priceMode: string;      // โหมดราคา
  vatType: string;        // ประเภท VAT ที่ใช้
  debug?: {
    query?: string;       // Query ที่ใช้
    ruleMatched?: string; // ชื่อกฎที่ตรงกัน
  };
  error?: string;         // ข้อความ error หากเกิดข้อผิดพลาด
}
```

**ระบบ Fallback (ลำดับการค้นหา):**

| ลำดับ | ประเภท | priceType | เงื่อนไข |
|------|--------|-----------|---------|
| 0 | ราคาตามลูกค้า (Customer Specific) | 0 | `cust_code` = ลูกค้า, `price_type=3` |
| 1 | ราคากลุ่มลูกค้า (Customer Group) | 1 | `cust_group_1` = กลุ่มลูกค้า, `price_type=2` |
| 2 | ราคาขายทั่วไป General Sales | 2 | `price_type=1`, `price_mode=1` |
| 3 | ราคามาตรฐาน (Standard) | 3 | `price_type=1`, `price_mode=0` |
| 5 | ราคาตามสูตร (Formula) | 5 | ใช้ `price_level` ของลูกค้า |
| 6 | ราคาตามบาร์โค้ด (Barcode) | 6 | จาก `ic_inventory_barcode` |
| 7 | ราคาขายล่าสุด/เฉลี่ย (Transaction) | 7 | จาก `ic_trans_detail` |
| -1 | ไม่พบราคา (Not Found) | -1 | — |

**ตัวอย่างการใช้:**

```typescript
import { calculateCustomerProductPrice } from '@/actions/product';

const result = await calculateCustomerProductPrice('your_database', {
  icCode: 'P001',
  unitCode: 'PIECE',
  quantity: '10',
  customerCode: 'CUST001',
  vatType: 'ภาษีรวมใน',
  saleType: '0' // ขายเชื่อ
});

if (result.success) {
  console.log(`ราคา: ${result.price}`);
  console.log(`พบจาก: ${result.debug?.ruleMatched}`);
} else {
  console.error(result.error);
}
```

### 2. `getCustomerDiscount()`

ดึงส่วนลดสำหรับสินค้าตามลูกค้า

**Signature:**
```typescript
export async function getCustomerDiscount(
  database: string,
  icCode: string,
  unitCode: string,
  customerCode: string,
  quantity: number
): Promise<number>
```

**Return:** เปอร์เซ็นต์ส่วนลด (0-100) หรือ 0 หากไม่พบ

**ระบบการค้นหาส่วนลด:**

| ลำดับ | ประเภท | discount_type |
|------|--------|-----------------|
| 1 | ส่วนลดตามลูกค้า | 2 |
| 2 | ส่วนลดกลุ่มลูกค้า | 1 |
| 3 | ส่วนลดทั่วไป | 0 |

**ตัวอย่าง:**

```typescript
const discount = await getCustomerDiscount(database, 'P001', 'PIECE', 'CUST001', 10);
const finalPrice = price * (1 - discount / 100);
```

### 3. `calculateFormulaPrice()` (Helper)

คำนวณราคาตามสูตร

**Signature:**
```typescript
function calculateFormulaPrice(
  quantity: number,
  standardPrice: number,
  formula: string
): number
```

**Formula Syntax:**
- `{qty}` หรือ `{quantity}` → จำนวน
- `{standard}` หรือ `{standard_price}` → ราคามาตรฐาน
- ตัวดำเนินการ: `+`, `-`, `*`, `/`, `%`

**ตัวอย่าง:**
```typescript
const price = calculateFormulaPrice(
  10,
  1000,
  '{standard_price} * (1 - {qty} * 0.01)'  // ลดลง 1% ต่อหน่วย
);
```

## API Route: `/api/pricing`

### Endpoint

```
POST /api/pricing
```

### Request Body

```json
{
  "database": "smlerpmaindata",
  "icCode": "P001",
  "unitCode": "PIECE",
  "quantity": "10",
  "customerCode": "CUST001",
  "vatType": "ภาษีรวมใน",
  "saleType": "0"
}
```

### Response (Success)

```json
{
  "success": true,
  "data": {
    "basePrice": 1000,
    "discount": 5,
    "discountAmount": 50,
    "finalPrice": 950,
    "priceType": "0",
    "priceMode": "1",
    "vatType": "ภาษีรวมใน",
    "debug": {
      "ruleMatched": "Customer Specific Price"
    }
  }
}
```

### Response (Error)

```json
{
  "success": false,
  "error": "ไม่พบราคาสินค้าสำหรับลูกค้านี้"
}
```

## Database Tables ที่ใช้

### 1. `ic_inventory_price`
ตารางราคาสินค้า

**Columns:**
- `ic_code` - รหัสสินค้า
- `unit_code` - หน่วย
- `cust_code` - รหัสลูกค้า (customer specific)
- `cust_group_1` - กลุ่มลูกค้าหลัก
- `cust_group_2` - กลุ่มลูกค้ารอง
- `price_type` - ประเภท (0=customer, 1=sales, 2=group, 3=customer)
- `price_mode` - โหมด (0=standard, 1=sales)
- `sale_price1` - ราคา exclude VAT
- `sale_price2` - ราคา include VAT
- `sale_type` - ประเภทขาย (0=เชื่อ, 1=สด)
- `from_date`, `to_date` - ช่วงวัน
- `from_qty`, `to_qty` - ช่วงจำนวน

### 2. `ic_inventory_price_formula`
ตารางสูตรราคา

**Columns:**
- `ic_code` - รหัสสินค้า
- `unit_code` - หน่วย
- `price_0` - ราคาพื้นฐาน
- `price_1` to `price_9` - สูตรราคาตามระดับ
- `sale_type` - ประเภทขาย
- `tax_type` - ประเภท VAT

### 3. `ic_inventory_discount`
ตารางส่วนลด

**Columns:**
- `ic_code` - รหัสสินค้า
- `unit_code` - หน่วย
- `cust_code` - รหัสลูกค้า
- `cust_group_1`, `cust_group_2` - กลุ่มลูกค้า
- `discount_type` - ประเภท (0=ทั่วไป, 1=กลุ่ม, 2=ลูกค้า)
- `discount` - เปอร์เซ็นต์ส่วนลด
- `from_date`, `to_date` - ช่วงวัน
- `from_qty`, `to_qty` - ช่วงจำนวน

### 4. `ic_inventory_barcode`
ตารางบาร์โค้ดพร้อมราคา

**Columns:**
- `barcode` - เลขบาร์โค้ด
- `ic_code` - รหัสสินค้า
- `unit_code` - หน่วย
- `price` - ราคา exclude VAT
- `price_2` - ราคา include VAT
- `price_3`, `price_4` - ราคาระดับอื่น

### 5. `ic_trans_detail`
ตารางประวัติการขาย

**Columns:**
- `doc_no`, `doc_date`, `doc_time` - เอกสารข้อมูล
- `cust_code` - รหัสลูกค้า
- `item_code` - รหัสสินค้า
- `unit_code` - หน่วย
- `price_exclude_vat`, `price` - ราคา
- `trans_flag` - ประเภทธุรกรรม (44 = ขาย)
- `last_status` - สถานะ

### 6. `ar_customer_detail`
รายละเอียดลูกค้า

**Columns:**
- `ar_code` - รหัสลูกค้า
- `group_main` - กลุ่มลูกค้าหลัก
- `group_sub_1`, `group_sub_2`, `group_sub_3`, `group_sub_4` - กลุ่มรอง
- `price_level` - ระดับราคา (0-9)

### 7. `erp_option`
ตัวเลือกระบบ

**Columns:**
- `get_last_price_type` - ใช้ราคาล่าสุด (0=ไม่, 1=ล่าสุด, 2=เฉลี่ย)
- `ic_price_formula_control` - ใช้สูตรราคา (0/1)

## การรวมกับ UI

### ตัวอย่าง: แสดงราคาเมื่อเลือกลูกค้า

```typescript
'use client';

import { useState } from 'react';
import { calculateCustomerProductPrice } from '@/actions/product';

export function ProductPricingComponent({ 
  product, 
  database 
}: { product: ProductInfo; database: string }) {
  const [customerCode, setCustomerCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [pricing, setPricing] = useState(null);

  async function handleCalculatePrice() {
    const result = await calculateCustomerProductPrice(database, {
      icCode: product.code,
      unitCode: 'PIECE',
      quantity,
      customerCode,
      vatType: 'ภาษีรวมใน'
    });
    setPricing(result);
  }

  return (
    <div>
      <input
        type="text"
        placeholder="รหัสลูกค้า"
        value={customerCode}
        onChange={(e) => setCustomerCode(e.target.value)}
      />
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <button onClick={handleCalculatePrice}>
        คำนวณราคา
      </button>
      
      {pricing?.success && (
        <div>
          <p>ราคา: {pricing.price}</p>
          <p>วิธีการค้นหา: {pricing.debug?.ruleMatched}</p>
        </div>
      )}
    </div>
  );
}
```

## หมายเหตุสำคัญ

1. **วันที่**: ตรวจสอบว่าวันปัจจุบันอยู่ในช่วง `from_date` - `to_date` ของจดหมายกำหนดราคา
2. **ปริมาณ**: ตรวจสอบว่าจำนวนที่ขออยู่ในช่วง `from_qty` - `to_qty`
3. **VAT**: ใช้ `sale_price1` หรือ `sale_price2` ตามประเภท VAT
4. **ประเภทการขาย**: กรองตามประเภท (เชื่อ/สด)
5. **ความปลอดภัย**: ใช้ parameterized queries เพื่อป้องกัน SQL injection

## Performance Tips

- เรียก `calculateCustomerProductPrice()` และ `getCustomerDiscount()` พร้อมกัน
- Cache ผลลัพธ์ราคาสำหรับลูกค้าเดียวกันหากมีการค้นหาซ้ำ
- ใช้ indexes ในตาราง `ic_inventory_price` บน columns: `ic_code`, `unit_code`, `cust_code`, `price_type`
