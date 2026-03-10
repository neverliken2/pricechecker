# NextStep Price Checker - Copilot Instructions

## 📱 Project Overview

**NextStep Price Checker** เป็นระบบ Web Application สำหรับการเช็คราคาสินค้าแบบเรียลไทม์ โดยใช้การสแกนบาร์โค้ด ระบบนี้ออกแบบมาเพื่อให้ลูกค้าและเจ้าหน้าที่ร้านค้าสามารถค้นหาราคาสินค้าได้อย่างรวดเร็วและสะดวก พร้อมการสนับสนุนระบบราคาแบบขั้นบันไดที่ซับซ้อนสำหรับลูกค้าธุรกิจ

## 🎯 Project Purpose

- ลดเวลาในการค้นหาราคาสินค้า
- รองรับราคาที่ต่างกันตามประเภทลูกค้า (Customer-specific pricing)
- สนับสนุนการจัดการฐานข้อมูลหลายแห่ง (Multi-database support)
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

✅ **Simple Barcode Pricing** - ดึงราคาจาก barcode เฉพาะ
✅ **Multi-Database Support** - เข้าถึงหลายฐานข้อมูลจากอินเทอร์เฟสเดียว
✅ **Real-time Barcode Scanning** - อัตราปฏิกิริยาการค้นหาไว
✅ **Search History** - เก็บประวัติการค้นหาสำหรับอ้างอิง
✅ **VAT Type Support** - รองรับภาษีรวม/แยก
✅ **Multiple Price Fields** - ราคาจาก 4 ช่อง (price, price_2, price_3, price_4)

## 🗄️ Database Tables

- `sml_user_list` - ข้อมูลผู้ใช้
- `sml_database_list` - รายการฐานข้อมูล
- `ic_inventory` - ข้อมูลสินค้า
- `ic_unit` - หน่วยสินค้า
- `ic_class` - ประเภทสินค้า
- `ic_customer` - ข้อมูลลูกค้า
- `ic_price` - ตารางราคา
- `ic_discount` - ตารางส่วนลด

## 🔑 Important Functions

### `calculateCustomerProductPrice()`
ฟังชั่นหลักสำหรับค้นหาและดึงราคาสินค้าจาก barcode (ตาราง ic_inventory_barcode)

**Location:** `src/actions/product.ts`

**Parameters:**
- `database` - ชื่อฐานข้อมูล
- `params.icCode` - รหัสสินค้า
- `params.vatType` - ประเภท VAT (ภาษีรวมใน/ภาษีแยกนอก)

**Returns:** `PriceCalculationResult` - ราคาและข้อมูลการคำนวณ

### `searchProductByBarcode()`
ค้นหาสินค้าจาก barcode และดึงข้อมูลสินค้า

### `getProductBarcodes()`
ดึงรายการ barcode ทั้งหมดของสินค้าพร้อมราคา

## 💡 Coding Standards

- Use **TypeScript** for type safety
- Follow **Server Actions** for backend logic (prefer over API routes when possible)
- Use **React Context** for authentication state
- Add **proper error handling** in try-catch blocks
- Implement **input validation** in all endpoints
- Use **parameterized queries** to prevent SQL injection
- Write **clear comments** for complex pricing logic
- Keep **component propTypes/interfaces** well-documented

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Open browser
# http://localhost:3000
```

## 📚 Documentation Files

- `README.md` - Project overview and setup guide
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `PRICING_FUNCTIONS.md` - Detailed API documentation
- `PRICING_EXAMPLES.tsx` - Real-world usage examples
- `INTEGRATION_GUIDE.md` - Integration guide

## 🤖 AI Assistant Guidelines

When helping with this project:
1. **Refer to pricing logic carefully** - The 7-tier fallback system is critical
2. **Always validate input parameters** - Customer code, product code, quantity
3. **Consider database performance** - Use indexes on frequently queried columns
4. **Handle edge cases** - Missing prices, invalid customers, quantity out of range
5. **Write clear error messages** - Help users understand what went wrong
6. **Document complex formulas** - Especially for dynamic pricing calculations
7. **Test with multiple customers** - Different price tiers should be verified
