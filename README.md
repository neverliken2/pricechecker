# NextStep Price Checker

ระบบเช็คราคาสินค้าด้วยบาร์โค้ด สำหรับให้ลูกค้าสแกนเพื่อเช็คราคา

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
