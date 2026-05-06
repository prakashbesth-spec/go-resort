# 🏖️ GO RESORT - Full Stack Vacation Rental Platform

A premium vacation rental platform (inspired by HolidayKeepers) featuring a modern interactive frontend and a robust Node.js/MongoDB backend.

## 🌟 Features
- **Interactive Frontend:** Multi-page experience with dynamic property fetching.
- **Robust Backend:** Secure REST API with role-based authentication (Guest, Host, Admin).
- **Cloud Integration:** Image uploads via Cloudinary and payments via Razorpay.
- **Database:** MongoDB Atlas with Mongoose ODM.
- **Security:** JWT authentication, password hashing, and CORS protection.

---

## 📁 Project Structure
```
go-resort/
├── go-resort-backend/    # Node.js API Server
│   ├── config/           # Database & Cloudinary configuration
│   ├── controllers/      # API logic & handlers
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express API endpoints
│   └── server.js         # Entry point
├── Go resort1.html       # Homepage (Interactive)
├── Destinations.html     # Destinations Gallery
├── Stays.html            # Dynamic Property Listing
├── Experiences.html      # Signature Experiences
├── Blog.html             # Travel Inspiration
└── Host.html             # Hosting Landing Page
```

---

## ⚡ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/prakashbesth-spec/go-resort.git
cd go-resort
```

### 2. Backend Setup
```bash
cd go-resort-backend
npm install
```

### 3. Environment Variables
Create a `.env` file in the `go-resort-backend` folder:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_super_secret_key
ALLOWED_ORIGINS=*
```

### 4. Run the Server
```bash
npm run dev
```
The server will start at `http://localhost:5000`.

### 5. Launch the Website
Simply open **`Go resort1.html`** in your browser (or use VS Code **Live Server**).

---

## 🛠️ Technology Stack
- **Frontend:** HTML5, Vanilla CSS3, Javascript (Fetch API)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **Authentication:** JWT (JSON Web Tokens)
- **Utilities:** Multer, Cloudinary, Razorpay, Nodemailer

---

## 🧪 Testing the API
You can test the backend health by visiting:
`http://localhost:5000/api/health`

To see the live properties on your website, ensure your MongoDB connection is active and use the provided API endpoints to seed data.

---

*Built with ❤️ for the GO RESORT Platform*
