# NextStep Price Checker - Copilot Instructions

## 📱 Project Overview

**NextStep Price Checker** เป็นระบบ Web Application สำหรับการเช็คราคาสินค้าแบบเรียลไทม์ โดยใช้การสแกนบาร์โค้ด ระบบนี้ออกแบบมาเพื่อให้ลูกค้าและเจ้าหน้าที่ร้านค้าสามารถค้นหาราคาสินค้าได้อย่างรวดเร็วและสะดวก ด้วยการดึงราคาจากบาร์โค้ดแต่ละหน่วยโดยตรง

## 🎯 Project Purpose

- ลดเวลาในการค้นหาราคาสินค้า
- ตรวจสอบราคาแบบ real-time โดยสแกนบาร์โค้ด
- สนับสนุนการจัดการฐานข้อมูลหลายแห่ง (Multi-database support)
- เลือกหน่วยต่างๆของสินค้าและดูราคาตามหน่วย
- ให้บริการแก่ลูกค้าและพนักงานผ่าน Web Interface ที่ใช้งานง่าย

## 🏗️ Tech Stack

- **Frontend:** React 19, TailwindCSS 4 (Responsive Design)
- **Backend:** Next.js 16 (App Router, Server Actions)
- **Database:** PostgreSQL
- **Authentication:** Session-based dengan server validation
- **Icons:** Lucide React
- **Type System:** TypeScript

## 📁 Project Structure

```
src/
├── actions/          # Server Actions & Backend Logic
│   ├── auth.ts       # Authentication logic
│   ├── session.ts    # Session management
│   └── product.ts    # Product search & pricing calculations
├── app/              # Next.js App Router
│   ├── page.tsx      # Main scanner page
│   ├── login/        # Login page
│   ├── select-database/ # Database selection page
│   └── api/          # API routes
│       └── pricing/  # /api/pricing endpoint
├── context/
│   └── AuthContext.tsx # Authentication context
└── lib/
    ├── db.ts         # Database connection
    ├── database.ts   # Database configuration
    ├── auth-server.ts # Auth utilities
    └── utils.ts      # Helper functions
```

## ✨ Key Features

✅ **Simple Barcode Pricing** - ดึงราคาจาก barcode เฉพาะ (price, price_2, price_3, price_4 fallback)
✅ **Multi-Database Support** - เข้าถึงหลายฐานข้อมูลจากอินเทอร์เฟสเดียว
✅ **Unit Selection** - เลือกหน่วยต่างๆ และดูราคาต่างตามหน่วย
✅ **Real-time Barcode Scanning** - อัตราปฏิกิริยาการค้นหาไว (debounce 300ms for barcode, 600ms for text)
✅ **Search History** - เก็บประวัติการค้นหา 10 รายการล่าสุด
✅ **Multiple Price Fields** - ราคาจาก 4 ช่อง with fallback chain

## 🗄️ Database Tables

### Auth Database (smlerpmaindemo)
- `sml_user_list` - information user (login credentials)
- `sml_database_list` - list of available databases (code, database_name, data_group)

### Operational Database (demo or selected)
- `ic_inventory` - product information
- `ic_inventory_barcode` - barcode and pricing data (key table for price lookup)
  - Columns: barcode, unit_code, price, price_2, price_3, price_4, ic_code
- `ic_unit` - units of measurement
- `ic_class` - product classifications

Note: The simplified barcode pricing system uses `ic_inventory_barcode` as the primary source

## 🔑 Important Functions

### `calculateAllPricesByUnits()`
ฟังชั่นหลักสำหรับดึงราคาสินค้าโดยเรียงตามหน่วยที่ต่างกัน

**Location:** `src/actions/product.ts`

**Parameters:**
- `database` - ชื่อฐานข้อมูล
- `icCode` - รหัสสินค้า
- `barcodes` - array ของ barcode info

**Returns:** `AllPricesResult` - ราคาแยกตามหน่วย

**Logic:** 
- ไม่มี customer pricing, discount, หรือ VAT adjustment
- Fallback chain: price_2 (if > 0) → price → price_3 → price_4
- ใช้ราคาจากตาราง `ic_inventory_barcode` โดยตรง

### `searchProductByBarcode()`
ค้นหาสินค้าจาก barcode และดึงข้อมูลสินค้าพร้อม barcodes ทั้งหมด

### `getProductBarcodes()`
ดึงรายการ barcode ทั้งหมดของสินค้าพร้อมราคาจาก `ic_inventory_barcode`

## 💡 Coding Standards

- Use **TypeScript** for type safety
- Follow **Server Actions** for backend logic (prefer over API routes when possible)
- Use **React Context** for authentication state
- Add **proper error handling** in try-catch blocks
- Implement **input validation** in all endpoints
- Use **parameterized queries** to prevent SQL injection
- Write **clear comments** for complex pricing logic
- Keep **component propTypes/interfaces** well-documented

## � Authentication & Database Connection Flow

### Database Architecture
- **Auth Database:** `smlerpmaindemo` - เก็บข้อมูล user & database list
- **Operational Database:** Selectable (e.g., `demo`, `DEMO1`, `AKABEKO`, etc.)
- **Image Database:** `{database}_images` - เก็บรูปสินค้า

### Login Process
1. **Step 1:** User enters Provider, DataGroup, Username, Password
2. **Step 2:** System verifies credentials against `sml_user_list` in `smlerpmaindemo`
3. **Step 3:** System retrieves available databases from `sml_database_list` (filtered by DataGroup)
4. **Step 4:** User redirected to `/select-database` to choose which database
5. **Step 5:** Selected database stored in session cookie
6. **Step 6:** Application queries selected database for product/price data

### Available Test Databases
- **DEMO** - Main demo database with test data (Code: `99-0037`, `19-5945`, etc.)
- **AKABEKO, CONSTRUCTION, STEEL, WHOLESALE, TEST, YK_TEST** - Other available databases

### Database Connection Details
```
Host: demserver.3bbddns.com
Port: 47309
User: postgres
Password: sml
Auth DB: smlerpmaindemo
Operational DB: demo (or user-selected)
```

### Verified Data in DEMO Database
- ✅ `ic_inventory_barcode` table exists
- ✅ Columns: barcode, unit_code, price, price_2, price_3, price_4
- ✅ Sample data: 
  - IC Code: 99-0037, Barcode: 1489348659849, Price: 50.00 (ชิ้น)
  - IC Code: 19-5945, Barcode: 8858684006649, Price: 25.00 (ชิ้น)
  - IC Code: 19-5927, Barcode: 6521041330061, Price: 10.00 (ชิ้น)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Ensure these are set:
# DB_HOST=demserver.3bbddns.com
# DB_PORT=47309
# DB_USER=postgres
# DB_PASSWORD=sml
# DB_NAME_PREFIX=smlerpmain (for dynamic database naming)

# Run development server
npm run dev

# Open browser and login
# http://localhost:3000
# 
# Login Flow:
# 1. Login page: Enter Provider, DataGroup, Username, Password
# 2. Select Database page: Choose "DEMO" from dropdown
# 3. Main scanner page: Scan or search for product barcode
```

## 📚 Documentation Files

- `README.md` - Project overview and setup guide
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `PRICING_FUNCTIONS.md` - Detailed API documentation
- `PRICING_EXAMPLES.tsx` - Real-world usage examples
- `INTEGRATION_GUIDE.md` - Integration guide

## 🤖 AI Assistant Guidelines

When helping with this project:
1. **Barcode pricing logic** - Use fallback chain: price_2 → price → price_3 → price_4 (first non-zero value)
2. **Database selection** - User must select database in /select-database page, not hardcoded
3. **Unit selection** - Track selectedBarcodeUnit state to display correct unit's price
4. **Input validation** - Sanitize search text, validate barcodes, handle edge cases
5. **Session management** - Always validate selected_database from session before querying
6. **Handle debouncing** - Barcode scans (8+ digits) debounce 300ms, text search debounces 600ms
7. **Error handling** - Database connection errors should show user-friendly messages
8. **No VAT/Discount** - Current system removed VAT calculation and discount logic, keep prices as-is from database
