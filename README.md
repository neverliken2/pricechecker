# NextStep Price Checker

## 📱 Introduction

**NextStep Price Checker** เป็นระบบ Web Application สำหรับการเช็คราคาสินค้าแบบเรียลไทม์ โดยใช้การสแกนบาร์โค้ด ระบบนี้ออกแบบมาเพื่อให้ลูกค้าและเจ้าหน้าที่ร้านค้าสามารถค้นหาราคาสินค้าได้อย่างรวดเร็วและสะดวก พร้อมการสนับสนุนระบบราคาแบบขั้นบันไดที่ซับซ้อนสำหรับลูกค้าธุรกิจ

### 🎯 วัตถุประสงค์

- ลดเวลาในการค้นหาราคาสินค้า
- รองรับราคาที่ต่างกันตามประเภทลูกค้า (Customer-specific pricing)
- สนับสนุนการค้นหาสินค้าในระดับเองค์กร (Multi-database)
- ให้บริการแก่ลูกค้าและพนักงานผ่าน Web Interface ที่ใช้งานง่าย

### 🏗️ สถาปัตยกรรม

- **Frontend:** React 19 + TailwindCSS 4 (Responsive Design)
- **Backend:** Next.js 16 (API Route + Server Actions)
- **Database:** PostgreSQL
- **Authentication:** Session-based dengan server validation

### ✨ ไฮไลท์เด่น

- ✅ **Simple Barcode Pricing** - ดึงราคาจาก barcode ตัวเดียว (ง่าย และรวดเร็ว)
- ✅ **Multi-Database Support** - เข้าถึงหลายฐานข้อมูลจากอินเทอร์เฟสเดียว
- ✅ **Real-time Barcode Scanning** - อัตราปฏิกิริยาการค้นหาไว
- ✅ **Search History** - เก็บประวัติการค้นหาสำหรับอ้างอิง
- ✅ **VAT Type Support** - รองรับภาษีรวม/แยก

## Features

- 🔐 **Login System** - เข้าสู่ระบบด้วย Provider/Username/Password
- 🗄️ **Database Selection** - เลือกฐานข้อมูลที่ต้องการใช้งาน
- 📊 **Barcode Scanner** - สแกนบาร์โค้ดหรือพิมพ์รหัสสินค้า
- 💰 **Price Display** - แสดงราคาสินค้าแบบใหญ่ชัดเจน
- 📦 **Stock Info** - แสดงจำนวนสินค้าคงเหลือ
- 🔍 **Search** - ค้นหาสินค้าจากชื่อหรือรหัส
- 📜 **History** - ประวัติการค้นหาล่าสุด

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, TailwindCSS 4
- **Database:** PostgreSQL (pg)
- **Icons:** Lucide React

## Getting Started

### 1. Install Dependencies

```bash
cd NextStep_PriceChecker
npm install
```

### 2. Configure Environment

สร้างไฟล์ `.env.local` จาก `.env.example`:

```bash
cp .env.example .env.local
```

แก้ไขค่าใน `.env.local`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME_PREFIX=smlerpmain
```

### 3. Run Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Database Structure

ระบบเชื่อมต่อกับ PostgreSQL โดยใช้ tables:

- `sml_user_list` - ข้อมูลผู้ใช้
- `sml_database_list` - รายการฐานข้อมูล
- `ic_inventory` - ข้อมูลสินค้า
- `ic_unit` - หน่วยสินค้า
- `ic_class` - ประเภทสินค้า

## Project Structure

```
src/
├── actions/          # Server Actions
│   ├── auth.ts       # Login
│   ├── session.ts    # Session management
│   └── product.ts    # Product search
├── app/              # App Router
│   ├── page.tsx      # Main scanner page
│   ├── login/        # Login page
│   └── select-database/ # Database selection
├── context/
│   └── AuthContext.tsx
└── lib/
    ├── db.ts         # Database connection
    ├── database.ts   # DB config
    └── auth-server.ts # Auth helpers
```

## Usage

### สำหรับลูกค้า

1. เปิดหน้าเว็บ
2. ใช้เครื่องสแกนบาร์โค้ดสแกนสินค้า
3. ดูราคาที่แสดงบนหน้าจอ

### สำหรับการติดตั้ง

1. เชื่อมต่อเครื่องสแกนบาร์โค้ดกับคอมพิวเตอร์/แท็บเล็ต
2. ตั้งค่าสแกนเนอร์ให้ส่ง Enter หลังจากสแกน
3. Focus ที่ช่องค้นหาในหน้าเว็บ
4. สแกนบาร์โค้ด

## License

© 2026 NextStep Software & Hardware
