# SM Technology - E-Commerce Backend API

**Production URL:** https://sm-technology-api.onrender.com

A production-ready Node.js/TypeScript backend API featuring dual payment processing (Stripe & PayPal), real-time notifications via Socket.io, AI-powered chatbot, JWT authentication with refresh tokens, and comprehensive order management.

---

## 🚀 **Features**

- ✅ **Dual Payment Processing** - Stripe & PayPal integration with webhook verification
- ✅ **Real-time Notifications** - Socket.io for instant order updates
- ✅ **AI Chatbot** - OpenRouter integration with conversation history
- ✅ **JWT Authentication** - Access + Refresh token strategy (15min/7day)
- ✅ **CSRF Protection** - Secure against cross-site attacks
- ✅ **Rate Limiting** - Redis-backed with automatic fallback
- ✅ **Role-Based Access Control** - User, Admin, Super Admin roles
- ✅ **Database Migrations** - Prisma ORM with PostgreSQL
- ✅ **Production Deployment** - Deployed on Render with auto-deploy

---

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [API Endpoints](#api-endpoints)
7. [Webhook Setup](#webhook-setup)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Architecture](#architecture)

---

## 📦 **Prerequisites**

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14
- **Redis** (optional - falls back to in-memory)
- **npm** or **yarn**
- **Stripe Account** (for payment testing)
- **OpenRouter API Key** (for AI chatbot)

---

## 🛠 **Installation**

### **1. Clone Repository**
```bash
git clone https://github.com/Kutubuddin-Rasel/SM_TECHNOLOGY.git
cd SM_TECHNOLOGY
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Generate Prisma Client**
```bash
npx prisma generate
```

---

## 🔐 **Environment Variables**

Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sm_db"

# Redis (optional - uses in-memory fallback)
REDIS_URL="redis://localhost:6379"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
REFRESH_TOKEN_SECRET="your-super-secret-refresh-token-key-change-in-production"

# Stripe Payment
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# PayPal Payment (optional)
PAYPAL_CLIENT_ID="your_paypal_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret"
PAYPAL_WEBHOOK_ID="your_paypal_webhook_id"
PAYPAL_MODE="sandbox"  # or "live" for production

# OpenRouter AI (optional)
OPENROUTER_API_KEY="sk-or-v1-your-openrouter-key"

# Frontend (for CORS)
FRONTEND_URL="http://localhost:3000"
```

### **🔑 How to Get API Keys**

#### **Stripe:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (`sk_test_...`)
3. For webhook secret, see [Webhook Setup](#webhook-setup)

#### **OpenRouter (AI Chatbot):**
1. Go to https://openrouter.ai/
2. Sign up and navigate to **Keys**
3. Create new API key
4. **Free tier available** with Grok model

#### **PayPal (Optional):**
1. Go to https://developer.paypal.com/
2. Create sandbox app
3. Copy Client ID and Secret
4. For webhook ID, see [Webhook Setup](#webhook-setup)

---

## 🗄 **Database Setup**

### **1. Create PostgreSQL Database**
```bash
createdb sm_db
```

### **2. Run Migrations**
```bash
npx prisma migrate deploy
```

### **3. Seed Database (Optional)**
Creates test users: user, admin, and super_admin
```bash
npx prisma db seed
```

**Test Accounts Created:**
- `user@example.com` (password: `user123`) - Role: user
- `admin@example.com` (password: `admin123`) - Role: admin
- `superadmin@example.com` (password: `superadmin123`) - Role: super_admin

### **4. View Database (Optional)**
```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## ▶️ **Running the Application**

### **Development Mode:**
```bash
npm run dev
# Server runs at http://localhost:3000
```

### **Production Build:**
```bash
npm run build
npm start
```

### **Watch Logs:**
```bash
# Development logs appear in terminal
# Production: Check Render dashboard
```

---

## 📡 **API Endpoints**

**Base URL (Local):** `http://localhost:3000`  
**Base URL (Production):** `https://sm-technology-api.onrender.com`

### **🔐 Public Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/csrf/csrf-token` | Get CSRF token for protected requests |

### **🔑 Authentication**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login user | ❌ |
| `POST` | `/api/auth/refresh` | Refresh access token | ✅ (Refresh Token) |
| `POST` | `/api/auth/logout` | Logout current session | ✅ |

**Request Example (Register/Login):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```
Cookies set: `token` (access - 15min), `refreshToken` (refresh - 7days)

---

### **📦 Orders**

| Method | Endpoint | Description | Auth Required | CSRF Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/api/orders` | Create order | ✅ | ✅ |
| `PATCH` | `/api/orders/:id/status` | Update order status | ✅ (Admin) | ✅ |

**Create Order Request:**
```json
{
  "items": [
    {
      "title": "Wireless Keyboard",
      "price": 59.99,
      "quantity": 1
    }
  ],
  "paymentMethod": "stripe"
}
```

**Create Order Response:**
```json
{
  "order": {
    "id": "order-uuid",
    "totalAmount": 59.99,
    "paymentStatus": "pending",
    "orderStatus": "pending"
  },
  "payment": {
    "clientSecret": "pi_xxx_secret_yyy",
    "paymentId": "pi_xxx"
  }
}
```

**Update Status Request:**
```json
{
  "orderStatus": "shipped"
}
```

**Valid Statuses:** `pending`, `processing`, `shipped`, `delivered`, `cancelled`

---

### **💬 AI Chatbot**

| Method | Endpoint | Description | Auth Required | CSRF Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/api/chatbot` | Send AI message | ✅ | ✅ |

**Request:**
```json
{
  "message": "What are your business hours?"
}
```

**Response:**
```json
{
  "reply": "Our business hours are Monday-Friday 9AM-5PM EST.",
  "context": [
    {"role": "user", "content": "What are your business hours?"},
    {"role": "assistant", "content": "Our business hours are..."}
  ]
}
```

**Features:**
- Remembers last 6 messages per user
- Stored in Redis (1 hour TTL)
- Falls back to in-memory if Redis unavailable

---

### **💳 Payment Webhooks**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payments/stripe/webhook` | Stripe webhook handler |
| `POST` | `/payments/paypal/webhook` | PayPal webhook handler |

**⚠️ These endpoints are called by Stripe/PayPal, not by frontend!**

---

## 🔗 **Webhook Setup**

### **Stripe Webhooks**

#### **Local Development:**
```bash
# Terminal 1: Run your server
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/payments/stripe/webhook

# Terminal 3: Trigger test webhook
stripe trigger payment_intent.succeeded
```

#### **Production:**

1. **Go to Stripe Dashboard:**
   - Visit https://dashboard.stripe.com/webhooks
   - Click **"Add endpoint"**

2. **Configure Endpoint:**
   - **URL:** `https://sm-technology-api.onrender.com/payments/stripe/webhook`
   - **Events:** Select `payment_intent.succeeded`
   - Click **"Add endpoint"**

3. **Get Webhook Secret:**
   - Click on your endpoint
   - Click **"Reveal"** next to Signing secret
   - Copy the secret (starts with `whsec_...`)

4. **Add to Environment:**
   - Render Dashboard → Your Service → Environment
   - Add: `STRIPE_WEBHOOK_SECRET` = `whsec_your_secret`
   - Save (auto-redeploys)

**Webhook Payload (Stripe sends this):**
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "metadata": {
        "orderId": "your-order-id"
      }
    }
  }
}
```

---

### **PayPal Webhooks (Optional)**

**Note:** PayPal integration is complete but requires PayPal account for testing.

#### **Production Setup:**

1. **Go to PayPal Developer Dashboard:**
   - Visit https://developer.paypal.com/dashboard/webhooks

2. **Create Webhook:**
   - **URL:** `https://sm-technology-api.onrender.com/payments/paypal/webhook`
   - **Events:** Select `PAYMENT.CAPTURE.COMPLETED`
   - Save

3. **Get Webhook ID:**
   - Copy Webhook ID from dashboard

4. **Add to Environment:**
   - Add: `PAYPAL_WEBHOOK_ID` = `your-webhook-id`

**Webhook Payload (PayPal sends this):**
```json
{
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "custom_id": "your-order-id",
    "amount": {
      "value": "59.99"
    }
  }
}
```

---

## 🧪 **Testing**

### **Postman Collection**

Import `postman_collection.json` for complete API testing.

**Collection includes:**
- All 11 endpoints with examples
- Auto-save CSRF token script
- Admin login examples
- Chat history testing
- Order creation flows

**Update base URL:**
- Local: `http://localhost:3000`
- Production: `https://sm-technology-api.onrender.com`

### **Test Payment Flow (Stripe)**

**1. Create Order:**
```bash
# Use Postman: POST /api/orders
# Returns clientSecret
```

**2. Complete Payment:**
```bash
# Local (CLI):
stripe trigger payment_intent.succeeded

# Production (Dashboard):
# - Stripe Dashboard → Payments
# - Find your payment
# - Use test card: 4242 4242 4242 4242
```

**3. Verify Update:**
- Check logs for "Order updated to paid"
- Database: `paymentStatus` = "paid"
- Socket.io event sent to user

### **Stripe Test Cards**

| Card Number | Type | Result |
|-------------|------|--------|
| 4242 4242 4242 4242 | Visa | Success |
| 4000 0000 0000 9995 | Visa | Declined |
| 4000 0000 0000 3220 | Visa | Requires 3D Secure |

**Any future date, any CVC works**

---

## 🚀 **Deployment**

### **Deployed on Render**

**Live URL:** https://sm-technology-api.onrender.com

**Deployment Status:** ✅ Production Ready

### **Deploy Your Own**

**1. Push to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

**2. Create Render Account:**
- Go to https://render.com
- Sign up with GitHub

**3. Deploy with Blueprint:**
- Click **"New" → "Blueprint"**
- Connect repository
- Render detects `render.yaml`
- Click **"Apply"**

**What gets created:**
- ✅ Web Service (Node.js)
- ✅ PostgreSQL Database
- ✅ Auto-generated JWT secrets
- ✅ Automatic deploys on push

**4. Add Environment Variables:**
- Dashboard → Environment
- Add Stripe keys, OpenRouter key, etc.
- Save (auto-redeploys)

**5. Configure Webhooks:**
- Follow [Webhook Setup](#webhook-setup) section
- Use production URL

### **Free Tier Limits**

- **Web Service:** 750 hours/month
- **PostgreSQL:** 1GB storage, 90-day retention
- **Spin Down:** After 15min inactivity
- **Cold Start:** ~30 seconds on first request

**Upgrade to $7/month for:**
- 24/7 uptime (no cold starts)
- Unlimited retention
- More resources

---

## 🏗 **Architecture**

### **Tech Stack**

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis (optional)
- **Real-time:** Socket.io
- **Auth:** JWT (jsonwebtoken)
- **Validation:** Zod
- **Payments:** Stripe, PayPal
- **AI:** OpenRouter (Grok model)

### **Project Structure**

```
SM/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Test data seeder
├── src/
│   ├── config/
│   │   ├── index.ts           # Centralized config
│   │   └── redis.ts           # Redis connection
│   ├── middlewares/
│   │   ├── auth.middleware.ts # JWT verification
│   │   ├── csrf.middleware.ts # CSRF protection
│   │   ├── rbac.middleware.ts # Role-based access
│   │   └── rateLimit.middleware.ts
│   ├── modules/
│   │   ├── auth/              # Authentication
│   │   ├── orders/            # Order management
│   │   ├── payment/           # Payment processing
│   │   └── chat/              # AI chatbot
│   ├── socket/
│   │   └── socket.service.ts  # WebSocket handling
│   ├── routes/
│   │   ├── index.ts           # Route aggregator
│   │   └── csrf.routes.ts     # CSRF routes
│   ├── utils/
│   │   ├── logger.ts          # Logging utility
│   │   ├── time.ts            # Duration parser
│   │   └── prisma.ts          # Prisma client
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
├── .env                       # Environment variables
├── render.yaml                # Render deployment config
├── postman_collection.json    # API testing collection
└── package.json
```

### **Request Flow**

```
Client Request
    ↓
CORS + Helmet (Security)
    ↓
Cookie Parser
    ↓
Rate Limiter (Redis/Memory)
    ↓
Body Parser (JSON)
    ↓
Routes
    ↓
Auth Middleware (JWT)
    ↓
CSRF Middleware
    ↓
RBAC Middleware (if needed)
    ↓
Controller
    ↓
Service (Business Logic)
    ↓
Database (Prisma)
    ↓
Response
```

### **Payment Flow**

```
1. User creates order
   ↓
2. Backend creates Payment Intent (Stripe/PayPal)
   ↓
3. Returns clientSecret to frontend
   ↓
4. Frontend collects payment
   ↓
5. Payment processor charges card
   ↓
6. Webhook sent to backend
   ↓
7. Backend verifies signature
   ↓
8. Updates order status
   ↓
9. Emits Socket.io event to user
   ↓
10. Frontend shows success
```

---

## 🔒 **Security Features**

- ✅ **JWT Authentication** - Access + Refresh tokens
- ✅ **CSRF Protection** - Token-based validation
- ✅ **Helmet** - Security headers
- ✅ **CORS** - Configured origins
- ✅ **Rate Limiting** - Prevents abuse
- ✅ **Webhook Verification** - Signature validation
- ✅ **Input Validation** - Zod schemas
- ✅ **SQL Injection** - Prevented by Prisma
- ✅ **Trust Proxy** - Correct IP detection

---

## 📚 **Additional Documentation**

- **[LEARN_PAYMENTS.md](./LEARN_PAYMENTS.md)** - Complete payment systems guide
- **[LEARN_WEBSOCKETS.md](./LEARN_WEBSOCKETS.md)** - WebSocket/Socket.io explanation
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick lookup guide
- **[ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)** - Creating admin users
- **[RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)** - Deployment details
- **[POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)** - Postman collection guide

---

## 🐛 **Troubleshooting**

### **Build Fails**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **Database Connection Error**
```bash
# Verify DATABASE_URL in .env
psql $DATABASE_URL  # Test connection
npx prisma migrate deploy  # Run migrations
```

### **Redis Connection Error**
**Not critical** - App automatically falls back to in-memory storage.

To fix:
```bash
# Start Redis locally
redis-server

# Or remove REDIS_URL from .env
```

### **Webhook Not Firing**
1. Check webhook URL in dashboard
2. Verify webhook secret in .env
3. Check logs for signature errors
4. For local: Use Stripe CLI `stripe listen`

### **CSRF Token Error**
```bash
# Get fresh token
GET /api/csrf/csrf-token

# Use in header
X-CSRF-Token: your-token-here
```

