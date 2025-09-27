# SMS Verification Service

บริการยืนยันหมายเลข SMS สำหรับการเปิดใช้งานบัญชีและบริการต่างๆ

## 📁 โครงสร้างโปรเจกต์

```
SMS/
├── assets/                 # ไฟล์รูปภาพและไอคอน
│   └── logo.svg           # โลโก้ของเว็บไซต์
├── css/                   # ไฟล์ CSS
│   └── styles.css         # สไตล์หลักของเว็บไซต์
├── js/                    # ไฟล์ JavaScript
│   └── script.js          # ฟังก์ชันหลักของเว็บไซต์
├── index.html             # หน้าเว็บหลัก
├── backup.ps1             # สคริปต์สำรองข้อมูล
├── environment-check.md   # รายงานการตรวจสอบสภาพแวดล้อม
├── sms-verification-number-api.md  # เอกสาร SMS API
├── thunder-api-doc.md     # เอกสาร Thunder API
└── web-structure.md       # โครงสร้างเว็บไซต์
```

## 🚀 การเริ่มต้น

1. เปิดไฟล์ `index.html` ในเบราว์เซอร์
2. หรือใช้ Live Server extension ใน VS Code

## 🎯 ฟีเจอร์หลัก

### ✅ ที่พร้อมใช้งาน
- **หน้า Catalog** - เลือกประเทศ, ผู้ให้บริการ, และบริการ
- **Service Filtering** - กรองบริการตามประเภท (Social, Finance, Gaming)
- **Auth Modal** - ระบบเข้าสู่ระบบ/สมัครสมาชิก
- **Responsive Design** - รองรับทุกอุปกรณ์

### 🔄 กำลังพัฒนา
- เชื่อมต่อ SMS Verification API
- ระบบ Activation
- Backend Server

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Variables
- **Icons**: Font Awesome 6.0
- **Responsive**: Mobile-first approach

## 📱 การรองรับอุปกรณ์

- **Mobile**: 320px - 768px
- **Tablet**: 769px - 1024px  
- **Desktop**: 1025px+

## 🔧 การพัฒนา

### Branch Structure
- `main` - Production code
- `feat/catalog-page-skeleton` - หน้า Catalog พื้นฐาน

### การ Commit
```bash
git add .
git commit -m "feat: description"
git push origin branch-name
```

## 📋 TODO

- [ ] เชื่อมต่อ SMS Verification API
- [ ] สร้าง Backend Server
- [ ] เพิ่ม Database
- [ ] ระบบ User Management

## 📞 ติดต่อ

สำหรับคำถามหรือข้อเสนอแนะ กรุณาติดต่อทีมพัฒนา
