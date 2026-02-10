-- ============================================
-- SQL Queries for Price Checker
-- Data needed: code, name, barcode, unit, price, image
-- ============================================

-- 1. ข้อมูลสินค้า + บาร์โค้ด + หน่วย + ราคา
SELECT 
  ii.code,
  ii.name_1,
  ii.name_2,
  ib.barcode,
  ib.unit_code,
  ib.price,
  ib.price_2,
  ib.price_3,
  ib.price_4
FROM ic_inventory ii
LEFT JOIN ic_inventory_barcode ib ON UPPER(ii.code) = UPPER(ib.ic_code)
WHERE UPPER(ii.code) = UPPER('05-1026')
ORDER BY ib.barcode;

-- 2. รูปภาพสินค้า
SELECT image_id, image_file 
FROM demo_images.images 
WHERE UPPER(image_id) = UPPER('05-1026')
LIMIT 1;

-- ============================================
-- 7-Tier Pricing Queries (แทนค่า 05-1026)
-- ============================================

-- 0️⃣ TIER 0: Customer Specific Price (price_type=3)
SELECT roworder, sale_price1, sale_price2, price_mode, price_type
FROM ic_inventory_price
WHERE UPPER(ic_code) = UPPER('05-1026')
  AND UPPER(unit_code) = UPPER('ชิ้น')
  AND UPPER(cust_code) = UPPER('')
  AND price_type = 3
  AND CURRENT_DATE BETWEEN from_date AND to_date
  AND 1 BETWEEN from_qty AND to_qty
ORDER BY price_mode DESC, sale_type DESC
LIMIT 1;

-- 1️⃣ TIER 1: Customer Group Price (price_type=2)
SELECT roworder, sale_price1, sale_price2, price_mode, price_type
FROM ic_inventory_price
WHERE UPPER(ic_code) = UPPER('05-1026')
  AND UPPER(unit_code) = UPPER('ชิ้น')
  AND cust_group_1 = (SELECT group_main FROM ar_customer_detail WHERE UPPER(ar_code) = UPPER('') LIMIT 1)
  AND price_type = 2
  AND CURRENT_DATE BETWEEN from_date AND to_date
  AND 1 BETWEEN from_qty AND to_qty
ORDER BY price_mode DESC, sale_type DESC
LIMIT 1;

-- 2️⃣ TIER 2: General Sales Price (price_type=1, price_mode=1)
SELECT roworder, sale_price1, sale_price2, price_mode, price_type
FROM ic_inventory_price
WHERE UPPER(ic_code) = UPPER('05-1026')
  AND UPPER(unit_code) = UPPER('ชิ้น')
  AND price_type = 1
  AND price_mode = 1
  AND CURRENT_DATE BETWEEN from_date AND to_date
  AND 1 BETWEEN from_qty AND to_qty
ORDER BY sale_type DESC
LIMIT 1;

-- 3️⃣ TIER 3: Standard Price (price_type=1, price_mode=0)
SELECT roworder, sale_price1, sale_price2, price_mode, price_type
FROM ic_inventory_price
WHERE UPPER(ic_code) = UPPER('05-1026')
  AND UPPER(unit_code) = UPPER('ชิ้น')
  AND price_type = 1
  AND price_mode = 0
  AND CURRENT_DATE BETWEEN from_date AND to_date
  AND 1 BETWEEN from_qty AND to_qty
ORDER BY sale_type DESC
LIMIT 1;

-- 4️⃣ TIER 4-5: Formula Price
SELECT * FROM ic_inventory_price_formula
WHERE UPPER(ic_code) = UPPER('05-1026')
  AND UPPER(unit_code) = UPPER('ชิ้น')
  AND sale_type IN (0, 2)
ORDER BY sale_type DESC
LIMIT 1;

-- 5️⃣ TIER 6: Barcode Price
SELECT price, price_2, price_3, price_4
FROM ic_inventory_barcode
WHERE UPPER(ic_code) = UPPER('05-1026')
ORDER BY barcode
LIMIT 1;

-- 6️⃣ TIER 7: Transaction History Price
SELECT price_exclude_vat, price, vat_type
FROM ic_trans_detail
WHERE UPPER(cust_code) = UPPER('')
  AND UPPER(item_code) = UPPER('05-1026')
  AND UPPER(unit_code) = UPPER('ชิ้น')
  AND last_status = 0
  AND trans_flag = 44
  AND price_exclude_vat > 0
ORDER BY doc_date DESC, doc_time DESC
LIMIT 1;

