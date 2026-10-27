# Mera Kameti 💰

BC/Chit Fund Committee Management System

---

## 🚀 Setup & Run Karne Ka Tarika

### Requirements
- Node.js 18+ install hona chahiye (https://nodejs.org)

---

### Step 1: Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server `http://localhost:5000` pe chalega.

**Default Admin Login:**
- Phone: `0000000000`
- Password: `admin123`

---

### Step 2: Frontend Setup (naye terminal mein)

```bash
cd frontend
npm install
npm run dev
```

Website `http://localhost:5173` pe khulegi.

---

## 📱 Features

### Member (Customer)
- ✅ Self-register karein
- ✅ Har mahine payment submit karein (screenshot + reference number)
- ✅ Payment history dekhein
- ✅ Is mahine ka winner dekhein

### Admin (Aap)
- ✅ Dashboard pe sab stats
- ✅ Payments approve/reject karein
- ✅ Members manage karein
- ✅ Committee winner select karein
- ✅ Monthly PDF report download karein

---

## 📁 File Structure

```
mera-kameti/
├── backend/          ← Node.js + Express + SQLite
│   ├── server.js     ← Main server file
│   ├── database.js   ← DB setup + admin seed
│   ├── routes/       ← API endpoints
│   └── uploads/      ← Payment screenshots save hote hain
└── frontend/         ← React + Vite + Tailwind
    └── src/
        ├── pages/    ← Sab pages
        └── components/
```

---

## 🔧 WhatsApp Setup (Future)

`backend/utils/whatsapp.js` mein Twilio integration add karo:
1. Twilio account banao: https://twilio.com
2. WhatsApp sandbox ya Business API activate karo
3. `.env` mein keys daalo
4. `notifyWhatsApp()` function update karo

---

## 🌐 Production Deployment

- Backend: Railway.app ya Render.com (free)
- Frontend: Vercel ya Netlify (free)
- SQLite ko PostgreSQL se replace karo production mein
