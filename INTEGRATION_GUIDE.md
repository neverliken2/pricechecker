# Integration Guide - Using Advanced Pricing with Product Search

## Quick Integration Checklist

- [ ] Import pricing functions in your component
- [ ] Add customer context (from session/auth)
- [ ] Call pricing function when displaying product
- [ ] Handle loading states
- [ ] Display pricing information in UI
- [ ] Test with real customer data

## 1. Importing the Functions

```typescript
import {
  searchProductByBarcode,
  calculateCustomerProductPrice,
  getCustomerDiscount
} from '@/actions/product';
```

## 2. Updating Your Search Component

### Before (Current):
```typescript
// Just shows barcode price
const { data: product } = await searchProductByBarcode(database, barcode);
```

### After (With Customer Pricing):
```typescript
// Get product
const { data: product } = await searchProductByBarcode(database, barcode);

// Get customer pricing
if (product) {
  const pricing = await calculateCustomerProductPrice(database, {
    icCode: product.code,
    unitCode: product.barcodes[0]?.unit_code || 'PIECE',
    quantity: userQuantity,
    customerCode: currentUser.customerCode,
    vatType: 'ภาษีรวมใน'
  });

  const discount = await getCustomerDiscount(
    database,
    product.code,
    product.barcodes[0]?.unit_code || 'PIECE',
    currentUser.customerCode,
    userQuantity
  );
}
```

## 3. Complete Example: Product Page

```typescript
// app/page.tsx
'use client';

import { useState } from 'react';
import { searchProductByBarcode, calculateCustomerProductPrice, getCustomerDiscount } from '@/actions/product';

export default function SearchPage({ database, customerCode }: Props) {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Search product
      const result = await searchProductByBarcode(database, barcode);
      
      if (!result.success) {
        alert('ไม่พบสินค้า');
        setLoading(false);
        return;
      }

      setProduct(result.data);

      // 2. Get customer pricing
      const pricingResult = await calculateCustomerProductPrice(database, {
        icCode: result.data.code,
        unitCode: result.data.barcodes[0]?.unit_code || 'PIECE',
        quantity: quantity.toString(),
        customerCode,
        vatType: 'ภาษีรวมใน'
      });

      // 3. Get discount
      const discountPercent = pricingResult.success
        ? await getCustomerDiscount(
            database,
            result.data.code,
            result.data.barcodes[0]?.unit_code || 'PIECE',
            customerCode,
            quantity
          )
        : 0;

      const basePrice = pricingResult.success ? pricingResult.price : result.data.price;
      const discountAmount = basePrice * (discountPercent / 100);
      const finalPrice = basePrice - discountAmount;

      setPricing({
        basePrice,
        discountPercent,
        discountAmount,
        finalPrice,
        priceType: pricingResult.priceType,
        debug: pricingResult.debug
      });
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSearch} className="mb-6">
        <input
          type="text"
          placeholder="กรุณาสแกนบาร์โค้ดหรือระบุรหัสสินค้า"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="border p-2 mr-2"
          autoFocus
        />
        <input
          type="number"
          placeholder="จำนวน"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          min="1"
          className="border p-2 mr-2 w-20"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </form>

      {product && (
        <div className="bg-white p-6 rounded-lg shadow">
          {/* Product Info */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">{product.name_1}</h2>
            {product.name_2 && <p className="text-gray-600">{product.name_2}</p>}
            <p className="text-sm text-gray-500">รหัส: {product.code}</p>
            <p className="text-sm text-gray-500">ยี่ห้อ: {product.item_brand || '-'}</p>
            <p className="text-sm text-gray-500">คงเหลือ: {product.stock_qty} {product.unit_name}</p>
          </div>

          {/* Pricing Info */}
          {pricing && (
            <div className="bg-blue-50 p-4 rounded">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">ราคาปลีก</p>
                  <p className="text-2xl font-bold">{pricing.basePrice}</p>
                </div>

                {pricing.discountPercent > 0 && (
                  <div>
                    <p className="text-gray-600 text-sm">ส่วนลด</p>
                    <p className="text-xl font-bold text-red-600">
                      -{pricing.discountPercent}% (-{pricing.discountAmount})
                    </p>
                  </div>
                )}

                <div className="col-span-2 border-t pt-4">
                  <p className="text-gray-600 text-sm">ราคาสุดท้าย</p>
                  <p className="text-3xl font-bold text-green-600">{pricing.finalPrice}</p>
                </div>

                <div className="col-span-2 text-xs text-gray-500">
                  <p>วิธีค้นหา: {pricing.debug?.ruleMatched}</p>
                  <p>ประเภท: {pricing.priceType}</p>
                </div>
              </div>
            </div>
          )}

          {/* No Pricing Found */}
          {product && !pricing && (
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-yellow-800">
                ไม่พบราคาสินค้าเฉพาะสำหรับลูกค้ารายนี้ ใช้ราคาปลีก: {product.price}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 4. Key Integration Points

### Point A: Product List Page
```typescript
// Show pricing when hovering/clicking product
const pricingResult = await calculateCustomerProductPrice(database, {
  icCode: product.code,
  unitCode: product.barcodes[0]?.unit_code || 'PIECE',
  quantity: '1',
  customerCode
});
```

### Point B: Cart Page
```typescript
// Calculate per-item pricing and totals
const items = cartItems.map(async (item) => {
  const pricing = await calculateCustomerProductPrice(database, {
    icCode: item.code,
    unitCode: item.unit,
    quantity: item.quantity.toString(),
    customerCode
  });
  return { ...item, price: pricing.price };
});
```

### Point C: Invoice/Checkout
```typescript
// Final pricing verification and tax calculation
const confirmed = await calculateCustomerProductPrice(database, {
  icCode: item.code,
  unitCode: item.unit,
  quantity: item.qty.toString(),
  customerCode,
  vatType: 'ภาษีรวมใน'
});
```

## 5. Handling Special Cases

### Case 1: Customer Not Set
```typescript
// Use default barcode pricing
const pricing = product.barcodes[0] || { price: 0 };
```

### Case 2: Product Not Found in Pricing
```typescript
if (!pricingResult.success) {
  // Use barcode price as fallback
  usePrice(product.price);
}
```

### Case 3: Quantity Changes
```typescript
// Re-calculate when quantity changes
const newPricing = await calculateCustomerProductPrice(database, {
  ...params,
  quantity: newQuantity.toString()  // <- Changed
});
```

## 6. Performance Tips

### Optimize Multiple Products:
```typescript
// Don't await in loop - use Promise.all()
const prices = await Promise.all(
  products.map(p => 
    calculateCustomerProductPrice(database, {
      icCode: p.code,
      unitCode: p.unit,
      quantity: '1',
      customerCode
    })
  )
);
```

### Cache Customer Pricing:
```typescript
const priceCache = new Map<string, PriceCalculationResult>();
const key = `${customerCode}:${icCode}:${unitCode}:${quantity}`;

if (priceCache.has(key)) {
  return priceCache.get(key);
}
```

## 7. Error Handling Template

```typescript
try {
  const pricing = await calculateCustomerProductPrice(database, {
    icCode,
    unitCode,
    quantity: qty.toString(),
    customerCode
  });

  if (!pricing.success) {
    // Notification: show error msg, use fallback price
    showWarning(`ระบบราคาไม่พบข้อมูล: ${pricing.error}`);
    return fallbackPrice;
  }

  return pricing.price;
} catch (error) {
  // Network/Database error - use cached or fallback
  console.error('Pricing error:', error);
  return fallbackPrice;
}
```

## 8. UI Components Examples

### Price Display Component:
```typescript
export function PriceDisplay({ pricing, loading }: Props) {
  if (loading) return <Skeleton />;
  
  return (
    <div>
      <span className="text-2xl font-bold">{pricing.finalPrice}</span>
      {pricing.discountPercent > 0 && (
        <span className="badge">-{pricing.discountPercent}%</span>
      )}
    </div>
  );
}
```

### Pricing Comparison Component:
```typescript
export async function PriceComparison({ icCode, unitCode, quantity }: Props) {
  const customers = ['CUST001', 'CUST002', 'CUST003'];
  const prices = await Promise.all(
    customers.map(c => calculateCustomerProductPrice(db, {
      icCode, unitCode, quantity: quantity.toString(), customerCode: c
    }))
  );

  return <table>{/* render comparison */}</table>;
}
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Always returns -1 | Price not in DB | Add pricing rules for product |
| Wrong price tier | Wrong customer code | Verify customer setup |
| No discount applied | Discount rules missing | Add discount record |
| Very slow queries | Missing indexes | Add DB indexes |

For more details, see:
- 📖 `PRICING_FUNCTIONS.md` - Complete API reference
- 💡 `PRICING_EXAMPLES.tsx` - Real-world examples
- 🔧 `IMPLEMENTATION_SUMMARY.md` - Overview
