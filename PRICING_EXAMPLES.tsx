/**
 * QUICK EXAMPLES - Advanced Customer Pricing
 * 
 * ตัวอย่างการใช้งานฟังชั่นราคาขั้นสูงกับลูกค้า
 */

import { 
  calculateCustomerProductPrice, 
  getCustomerDiscount,
  searchProductByBarcode 
} from '@/actions/product';

// ============================================================================
// EXAMPLE 1: ค้นหาสินค้าจาก Barcode และดึงราคาตามลูกค้า
// ============================================================================

export async function getProductWithCustomerPricing(
  database: string,
  barcode: string,
  customerCode: string,
  quantity: number
) {
  // ขั้น 1: ค้นหาสินค้า
  const productResult = await searchProductByBarcode(database, barcode);
  
  if (!productResult.success || !productResult.data) {
    return { success: false, error: 'ไม่พบสินค้า' };
  }

  const product = productResult.data;

  // ขั้น 2: ดึงราคาตามลูกค้า
  const pricingResult = await calculateCustomerProductPrice(database, {
    icCode: product.code,
    unitCode: product.barcodes[0]?.unit_code || 'PIECE',
    quantity: quantity.toString(),
    customerCode,
    vatType: 'ภาษีรวมใน',
    saleType: '0'
  });

  // ขั้น 3: ดึงส่วนลด
  const discountPercent = await getCustomerDiscount(
    database,
    product.code,
    product.barcodes[0]?.unit_code || 'PIECE',
    customerCode,
    quantity
  );

  if (pricingResult.success) {
    const basePrice = pricingResult.price;
    const discountAmount = (basePrice * discountPercent) / 100;
    const finalPrice = basePrice - discountAmount;

    return {
      success: true,
      product,
      pricing: {
        basePrice,
        discountPercent,
        discountAmount,
        finalPrice,
        priceType: pricingResult.priceType,
        debug: pricingResult.debug
      }
    };
  }

  return { success: false, error: pricingResult.error };
}

// ============================================================================
// EXAMPLE 2: ค้นหาสินค้า (ทั่วไป) และใช้ราคาประเมิน
// ============================================================================

export async function getProductWithEstimatedPrice(
  database: string,
  productCode: string,
  customerCode: string = 'DEFAULT',
  quantity: number = 1
) {
  const productResult = await searchProductByBarcode(database, productCode);
  
  if (!productResult.success || !productResult.data) {
    return null;
  }

  const product = productResult.data;

  // พยายามดึงราคาตามลูกค้า, ถ้าไม่พบใช้ราคา default
  let finalPrice = product.price; // fallback to default barcode price
  let pricingMethod = 'default_barcode';

  try {
    const customPricing = await calculateCustomerProductPrice(database, {
      icCode: product.code,
      unitCode: product.barcodes[0]?.unit_code || 'PIECE',
      quantity: quantity.toString(),
      customerCode
    });

    if (customPricing.success) {
      finalPrice = customPricing.price;
      pricingMethod = customPricing.debug?.ruleMatched || 'customer_pricing';
    }
  } catch (error) {
    console.warn('Failed to get customer pricing, using default:', error);
  }

  return {
    ...product,
    customerPrice: finalPrice,
    pricingMethod,
    quantity
  };
}

// ============================================================================
// EXAMPLE 3: ราคาขายส่วนหลาย (Bulk Pricing)
// ============================================================================

export async function getBulkPricing(
  database: string,
  icCode: string,
  unitCode: string,
  customerCode: string,
  quantities: number[] = [1, 5, 10, 25, 50, 100]
) {
  const prices = await Promise.all(
    quantities.map(async (qty) => {
      const result = await calculateCustomerProductPrice(database, {
        icCode,
        unitCode,
        quantity: qty.toString(),
        customerCode
      });
      return {
        quantity: qty,
        price: result.success ? result.price : 0,
        success: result.success
      };
    })
  );

  return {
    icCode,
    quantities: prices,
    bestDeal: prices.reduce((acc, curr) => 
      curr.price < acc.price ? curr : acc
    )
  };
}

// ============================================================================
// EXAMPLE 4: เปรียบเทียบราคาลูกค้าหลายราย
// ============================================================================

export async function compareCustomerPrices(
  database: string,
  icCode: string,
  unitCode: string,
  customerCodes: string[],
  quantity: number
) {
  const comparison = await Promise.all(
    customerCodes.map(async (customerCode) => {
      const result = await calculateCustomerProductPrice(database, {
        icCode,
        unitCode,
        quantity: quantity.toString(),
        customerCode
      });

      const discount = await getCustomerDiscount(
        database,
        icCode,
        unitCode,
        customerCode,
        quantity
      );

      return {
        customerCode,
        basePrice: result.price,
        discount,
        finalPrice: result.price * (1 - discount / 100),
        priceType: result.priceType
      };
    })
  );

  // จัดเรียงตามราคาที่ต่ำที่สุด
  return comparison.sort((a, b) => a.finalPrice - b.finalPrice);
}

// ============================================================================
// EXAMPLE 5: การใช้ใน Server Component
// ============================================================================

// app/product-detail/page.tsx
export async function ProductDetailPage({
  params
}: {
  params: { code: string }
}) {
  const database = 'your_database';
  const customerCode = 'CUST001'; // มาจาก session/context

  const result = await getProductWithCustomerPricing(
    database,
    params.code,
    customerCode,
    1
  );

  if (!result.success || !result.product) {
    return <div>Product not found</div>;
  }

  const product = result.product;
  const pricing = result.pricing;

  return (
    <div>
      <h1>{product.name_1}</h1>
      <p>Stock: {product.stock_qty}</p>
      
      <div className="pricing">
        <p>Price: {pricing.basePrice}</p>
        {pricing.discountPercent > 0 && (
          <>
            <p>Discount: {pricing.discountPercent}% (-{pricing.discountAmount})</p>
            <p className="final-price">{pricing.finalPrice}</p>
          </>
        )}
        <p className="text-sm text-gray-500">
          Method: {pricing.debug?.ruleMatched}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Real-time Price Updates (Client Component with API)
// ============================================================================

// 'use client'
// components/ProductPricingForm.tsx
/*
import { useState, useCallback } from 'react';

export function ProductPricingForm() {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = useCallback(async (
    database: string,
    icCode: string,
    unitCode: string,
    quantity: number,
    customerCode: string
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database,
          icCode,
          unitCode,
          quantity: quantity.toString(),
          customerCode
        })
      });

      const data = await response.json();
      if (data.success) {
        setPricing(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <button 
        onClick={() => handleCalculate('db', 'P001', 'PIECE', 10, 'CUST001')}
        disabled={loading}
      >
        {loading ? 'Calculating...' : 'Get Price'}
      </button>
      
      {pricing && (
        <div>
          Base: {pricing.basePrice}
          Discount: {pricing.discount}%
          Final: {pricing.finalPrice}
        </div>
      )}
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 7: Price History & Comparison
// ============================================================================

export async function getPriceHistory(
  database: string,
  icCode: string,
  unitCode: string,
  customerCode: string
) {
  // ดึงราคาจากวันที่ต่างๆ (ต้องทำให้ support หากต้องการ)
  // นี่คือโครงสร้างตัวอย่าง

  const currentPrice = await calculateCustomerProductPrice(database, {
    icCode,
    unitCode,
    quantity: '1',
    customerCode
  });

  return {
    icCode,
    currentPrice: currentPrice.success ? currentPrice.price : 0,
    trend: 'stable', // บันทึกจากประวัติ
    lastUpdated: new Date()
  };
}

// ============================================================================
// EXAMPLE 8: Export ราคาสำหรับ Invoice
// ============================================================================

export async function generateInvoiceLineItem(
  database: string,
  icCode: string,
  unitCode: string,
  customerCode: string,
  quantity: number
) {
  const product = await searchProductByBarcode(database, icCode);
  
  if (!product.success) {
    return null;
  }

  const pricing = await calculateCustomerProductPrice(database, {
    icCode,
    unitCode,
    quantity: quantity.toString(),
    customerCode,
    vatType: 'ภาษีรวมใน'
  });

  const discount = await getCustomerDiscount(database, icCode, unitCode, customerCode, quantity);

  const unitPrice = pricing.price;
  const discountAmount = unitPrice * discount / 100;
  const finalUnitPrice = unitPrice - discountAmount;
  const lineTotal = finalUnitPrice * quantity;

  return {
    itemCode: icCode,
    itemName: product.data?.name_1,
    quantity,
    unitPrice,
    discount: `${discount}%`,
    discountAmount: discountAmount,
    finalUnitPrice,
    lineTotal,
    vatIncluded: true
  };
}
