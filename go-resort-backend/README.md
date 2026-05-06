# 🏖️ GO RESORT – Backend API

> Production-ready REST API for the GO RESORT vacation rental platform  
> **Stack:** Node.js · Express.js · MongoDB · JWT · Razorpay · Cloudinary

---

## 📁 Folder Structure

```
go-resort-backend/
├── config/           # DB & Cloudinary config
├── controllers/      # Business logic (10 controllers)
├── middleware/       # Auth, error handler, upload, validation
├── models/           # Mongoose schemas (7 models)
├── routes/           # Express routers (10 route files)
├── utils/            # Email, token, API features, Razorpay
├── .env.example      # Environment variable template
├── server.js         # App entry point
└── package.json
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
cd go-resort-backend
npm install
```

### 2. Setup environment variables
```bash
cp .env.example .env
# Then edit .env with your credentials
```

### 3. Start development server
```bash
npm run dev
```

Server starts at: `http://localhost:5000`  
Health check: `GET http://localhost:5000/api/health`

---

## 🔐 Authentication

All protected routes require a **JWT Bearer token** in the header:
```
Authorization: Bearer <your_token>
```
Or the token is automatically set as an **httpOnly cookie** after login.

### Roles
| Role    | Access Level |
|---------|-------------|
| `guest` | Browse, book, review, wishlist |
| `host`  | All guest permissions + create/manage properties, manage bookings |
| `admin` | Full access including user management, approvals, analytics |

---

## 📡 API Endpoints

### Auth  `/api/auth`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user (guest/host) |
| POST | `/login` | Public | Login → returns JWT |
| POST | `/logout` | Private | Clear auth cookie |
| GET | `/me` | Private | Get current user |
| POST | `/forgot-password` | Public | Send password reset email |
| PUT | `/reset-password/:token` | Public | Reset password |
| PUT | `/change-password` | Private | Change password |

### Users  `/api/users`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/profile` | Private | Get own profile |
| PUT | `/profile` | Private | Update profile / avatar |
| GET | `/:id` | Public | Get host public profile |
| GET | `/` | Admin | List all users |
| DELETE | `/:id` | Admin | Delete user |
| PUT | `/:id/toggle-status` | Admin | Activate/deactivate user |

### Properties  `/api/properties`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | All approved properties (filterable) |
| GET | `/featured` | Public | Featured properties |
| GET | `/:id` | Public | Single property detail |
| GET | `/:id/availability` | Public | Availability calendar |
| GET | `/host/my-listings` | Host | Own listings |
| POST | `/` | Host | Create listing (with images) |
| PUT | `/:id` | Host/Admin | Update listing |
| DELETE | `/:id` | Host/Admin | Delete listing |
| DELETE | `/:id/images/:imageId` | Host/Admin | Delete a property image |
| PUT | `/:id/approve` | Admin | Approve/reject listing |

### Bookings  `/api/bookings`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Guest | Create booking |
| GET | `/my-bookings` | Guest | Guest's bookings |
| GET | `/host-bookings` | Host | Host's received bookings |
| GET | `/:id` | Private | Single booking detail |
| PUT | `/:id/cancel` | Private | Cancel booking |
| PUT | `/:id/confirm` | Host | Confirm booking |
| PUT | `/:id/complete` | Host/Admin | Mark as completed |

### Payments  `/api/payments`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/razorpay/create-order` | Guest | Create Razorpay order |
| POST | `/razorpay/verify` | Private | Verify payment signature |
| GET | `/booking/:bookingId` | Private | Payment record |
| GET | `/` | Admin | All payments |
| POST | `/:paymentId/refund` | Admin | Issue refund |

### Search  `/api/search`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Full search with filters |
| GET | `/destinations` | Public | All unique destinations |
| GET | `/suggestions?q=` | Public | Autocomplete suggestions |
| GET | `/categories` | Public | Category stats |

### Reviews  `/api/reviews`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Guest | Submit review (after checkout) |
| GET | `/my-reviews` | Private | Own reviews |
| GET | `/property/:id` | Public | Property reviews |
| PUT | `/:id/reply` | Host | Host reply to review |
| POST | `/:id/report` | Private | Report review |
| DELETE | `/:id` | Private | Delete review |

### Blogs  `/api/blogs`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Published blogs |
| GET | `/:slug` | Public | Single blog post |
| GET | `/admin/all` | Admin | All blogs (incl. drafts) |
| POST | `/` | Admin | Create blog post |
| PUT | `/:id` | Admin | Update blog post |
| DELETE | `/:id` | Admin | Delete blog post |

### Wishlist  `/api/wishlist`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Private | Get wishlist |
| POST | `/:propertyId` | Private | Add to wishlist |
| DELETE | `/:propertyId` | Private | Remove from wishlist |
| GET | `/check/:propertyId` | Private | Check if saved |

### Admin  `/api/admin`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/dashboard` | Admin | Stats & recent activity |
| GET | `/revenue/monthly` | Admin | Monthly revenue chart |
| GET | `/properties/pending` | Admin | Unapproved listings |
| GET | `/bookings` | Admin | All bookings |
| PUT | `/users/:id/role` | Admin | Change user role |
| GET | `/reviews` | Admin | All reviews |
| PUT | `/reviews/:id/toggle` | Admin | Approve/hide review |

---

## 💳 Razorpay Integration Flow

```
1. Guest clicks "Pay Now"
2. Frontend → POST /api/payments/razorpay/create-order { bookingId }
3. Backend creates Razorpay order → returns { orderId, amount, key }
4. Frontend opens Razorpay checkout modal
5. Guest completes payment
6. Frontend → POST /api/payments/razorpay/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
7. Backend verifies HMAC signature
8. On success → booking status = "confirmed", paymentStatus = "paid"
9. Email notifications sent to guest & host
```

**Frontend integration snippet:**
```javascript
const res = await fetch('/api/payments/razorpay/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ bookingId }),
});
const { data } = await res.json();

const options = {
  key: data.key,
  amount: data.amount,
  currency: data.currency,
  order_id: data.orderId,
  prefill: data.prefill,
  handler: async (response) => {
    await fetch('/api/payments/razorpay/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...response, bookingId }),
    });
  },
};
new window.Razorpay(options).open();
```

---

## 🔍 Search API Usage

```
GET /api/search?destination=Goa&checkIn=2024-12-20&checkOut=2024-12-25&guests=4&category=Villa&minPrice=5000&maxPrice=20000&sort=-rating.average
```

**Query params:**
| Param | Type | Example |
|-------|------|---------|
| `destination` | string | `Goa`, `Mumbai` |
| `checkIn` | ISO date | `2024-12-20` |
| `checkOut` | ISO date | `2024-12-25` |
| `guests` | number | `4` |
| `category` | string | `Villa`, `Cabin` |
| `minPrice` | number | `3000` |
| `maxPrice` | number | `15000` |
| `amenities` | comma-list | `Pool,WiFi,BBQ Grill` |
| `sort` | field | `-rating.average`, `pricePerNight` |
| `page` | number | `1` |
| `limit` | number | `12` |

---

## 🌐 Connecting Frontend HTML to API

In your HTML file, use `fetch()`:
```javascript
// Example: Load featured properties
const res = await fetch('http://localhost:5000/api/properties/featured');
const { data } = await res.json();
// Render cards with data[]

// Example: Search
const params = new URLSearchParams({ destination: 'Goa', checkIn: '2024-12-20', checkOut: '2024-12-25', guests: 2 });
const res = await fetch(`http://localhost:5000/api/search?${params}`);
```

---

## 🚀 Deployment (Railway / Render)

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
# Set env vars in Railway dashboard → Variables
```

### Render
1. Push to GitHub
2. New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all `.env` variables in Render Environment

### Environment checklist for production
- [ ] `NODE_ENV=production`
- [ ] Strong `JWT_SECRET` (64+ chars)
- [ ] Real MongoDB Atlas URI
- [ ] Razorpay **live** keys (not test)
- [ ] `ALLOWED_ORIGINS` = deployed frontend URL
- [ ] `FRONTEND_URL` = deployed frontend URL

---

## 🧪 Postman Testing

### Import collection
Create a new Postman collection and add these example requests:

**1. Register**
```
POST http://localhost:5000/api/auth/register
Body (JSON): { "name": "Test User", "email": "test@example.com", "password": "Test@1234", "role": "guest" }
```

**2. Login**
```
POST http://localhost:5000/api/auth/login
Body (JSON): { "email": "test@example.com", "password": "Test@1234" }
→ Copy token from response
```

**3. Get Featured Properties**
```
GET http://localhost:5000/api/properties/featured
```

**4. Search**
```
GET http://localhost:5000/api/search?destination=Goa&guests=2
```

**5. Create Booking (with token)**
```
POST http://localhost:5000/api/bookings
Headers: Authorization: Bearer <token>
Body: { "propertyId": "<id>", "checkIn": "2024-12-20", "checkOut": "2024-12-25", "guests": { "adults": 2 } }
```

**6. Admin Dashboard**
```
GET http://localhost:5000/api/admin/dashboard
Headers: Authorization: Bearer <admin_token>
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcryptjs (12 salt rounds) |
| JWT in httpOnly cookie | Prevents XSS token theft |
| Rate limiting | 100 req / 10 min / IP |
| NoSQL injection | express-mongo-sanitize |
| XSS protection | xss-clean |
| HTTP headers | helmet |
| Input validation | express-validator on all routes |
| File type check | MIME type whitelist in Multer |
| CORS whitelist | Only allowed origins |
| Role-based access | guest / host / admin guards |

---

## 📦 Tech Stack

| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT auth |
| cloudinary + multer | Image upload |
| razorpay | Payment gateway |
| nodemailer | Email notifications |
| helmet | Security headers |
| express-rate-limit | Brute-force protection |
| express-mongo-sanitize | NoSQL injection prevention |
| xss-clean | XSS prevention |
| express-validator | Input validation |
| slugify | URL-friendly slugs |
| morgan | HTTP request logging |

---

*Built for GO RESORT – HolidayKeepers Style Platform*  
*Suitable for internship submission & real-world portfolio* 🏆
