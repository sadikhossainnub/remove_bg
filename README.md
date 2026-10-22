# 🖼️ Remove BG — Personal AI Tool

ছবির ব্যাকগ্রাউন্ড মুছে ফেলুন সহজেই। **কোনো account নেই, কোনো API key নেই।**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.10+

### Installation

```bash
# 1. Clone করুন
git clone <repo>
cd "remove bg"

# 2. Dependencies install করুন
npm install               # root (concurrently)
npm install --prefix api  # backend
npm install --prefix app  # frontend

# 3. rembg AI install করুন
pip install "rembg[cpu,cli]"

# 4. চালান!
npm run dev
```

### Access
| | URL |
|-|-----|
| 🌐 App | http://localhost:3000/app |
| ⚙️ API | http://localhost:4000 |

---

## 📖 Usage

**Web UI:**
1. http://localhost:3000/app খুলুন
2. ছবি drag করুন বা click করে select করুন
3. AI process করবে (~3-10 সেকেন্ড)
4. Download করুন ✨

**Direct API:**
```bash
curl -X POST http://localhost:4000/remove \
  -F "image_file=@photo.jpg" \
  --output result.png
```

---

## 🗂️ Structure

```
remove bg/
├── app/        → Next.js Frontend
├── api/        → Express.js Backend
│   └── src/
│       ├── routes/remove.js
│       └── services/bgRemoval.js    ← rembg wrapper
└── package.json  → npm run dev (runs both)
```

---

## 🔧 Tech

- **Frontend**: Next.js 14, TypeScript, Vanilla CSS
- **Backend**: Express.js, Node.js
- **AI**: Python `rembg` (U2Net model via ONNX)

---

## 💡 ভবিষ্যতে SaaS বানাতে চাইলে

Auth, API Key, Rate Limiting, Billing সব আলাদা branch এ আছে।
এখন শুধু personal tool হিসেবে ব্যবহার করুন।
