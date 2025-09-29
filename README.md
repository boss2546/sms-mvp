# SMS Verification Service

บริการยืนยันหมายเลข SMS สำหรับการเปิดใช้งานบัญชีและบริการต่างๆ พร้อมระบบเติมเงิน QR Code Payment

## 🎯 ฟีเจอร์หลัก

### ✅ ที่พร้อมใช้งาน
- **QR Code Payment System** - ระบบเติมเงินด้วย PromptPay QR Code
- **Thunder API Integration** - ตรวจสอบสลิปการโอนเงิน
- **User Authentication** - ระบบเข้าสู่ระบบ/สมัครสมาชิก
- **Wallet Management** - จัดการยอดเงินและประวัติการทำรายการ
- **SMS Verification** - บริการยืนยันหมายเลข SMS
- **Responsive Design** - รองรับทุกอุปกรณ์

## 📁 โครงสร้างโปรเจกต์

```
SMS/
├── assets/                 # ไฟล์รูปภาพและไอคอน
│   ├── logo.svg           # โลโก้ของเว็บไซต์
│   └── promptpay-qr.jpg   # QR Code PromptPay
├── css/                   # ไฟล์ CSS
│   ├── styles.css         # สไตล์หลักของเว็บไซต์
│   ├── wallet-styles.css  # สไตล์สำหรับระบบเงิน
│   ├── auth-styles.css    # สไตล์สำหรับระบบ Auth
│   └── modal-styles.css   # สไตล์สำหรับ Modal
├── js/                    # ไฟล์ JavaScript
│   └── script.js          # ฟังก์ชันหลักของเว็บไซต์
├── server/                # Backend Server
│   ├── services/          # Business Logic Services
│   ├── middleware/        # Express Middleware
│   └── db/               # Database Files
├── index.html             # หน้าเว็บหลัก
├── server.js              # Node.js Server
├── package.json           # Dependencies
└── thunder-api-doc.md     # เอกสาร Thunder API
```

## 🚀 การเริ่มต้น

### Prerequisites
- Node.js 14+
- npm หรือ yarn

### Installation
```bash
# Clone repository
git clone https://github.com/boss2546/sms-mvp.git
cd sms-mvp

# Install dependencies
npm install

# Start server
node server.js
```

### Access
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api

## 🛠️ เทคโนโลยีที่ใช้

### Frontend
- **HTML5, CSS3, JavaScript (ES6+)**
- **CSS Grid, Flexbox, CSS Variables**
- **Font Awesome 6.0**
- **Mobile-first responsive design**

### Backend
- **Node.js + Express**
- **SQLite Database**
- **JWT Authentication**
- **Thunder API Integration**
- **Multer for file upload**

## 👤 Test User

```
Email: bossok2546@gmail.com
Password: 0898661896za
Balance: ฿20.00
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/refresh` - รีเฟรช token

### Wallet
- `GET /api/wallet/balance` - ดูยอดเงิน
- `GET /api/wallet/transactions` - ประวัติการทำรายการ

### Payment
- `POST /api/topup/verify/image` - ตรวจสอบสลิปการโอนเงิน

## 📱 การรองรับอุปกรณ์

- **Mobile**: 320px - 768px
- **Tablet**: 769px - 1024px  
- **Desktop**: 1025px+

## 🔧 การพัฒนา

### Branch Structure
- `main` - Production code
- `feat/auth-user-system` - Authentication & User System

### การ Commit
```bash
git add .
git commit -m "feat: description"
git push origin branch-name
```

## 📋 System Status

- ✅ Server: Running on http://localhost:3000
- ✅ Database: SQLite connected
- ✅ Thunder API: Accessible (with MockThunderService fallback)
- ✅ All services: Operational
- ✅ QR Payment: Working
- ✅ Slip Verification: Working

## 📞 ติดต่อ

สำหรับคำถามหรือข้อเสนอแนะ กรุณาติดต่อทีมพัฒนา
