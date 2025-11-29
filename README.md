# SM Backend - Real-Time Order Management System

A production-ready backend system featuring real-time order management, secure payment processing (Stripe/PayPal), and AI-powered chatbot integration with enterprise-grade security.

## 🚀 Features

### Core Features
- ✅ **JWT Authentication** - HTTP-only cookie-based auth with CSRF protection
- ✅ **Order Management** - Create and track orders with real-time updates
- ✅ **Payment Integration** - Stripe (production-ready) + PayPal (mocked)
- ✅ **Real-Time Updates** - Socket.io for instant order status notifications
- ✅ **AI Chatbot** - OpenRouter (Grok 4.1 Fast) with conversation context
- ✅ **Admin Dashboard** - RBAC with granular permissions
- ✅ **Webhook Handling** - Secure payment confirmation via webhooks

### Bonus Features
- 🔒 **HTTP-Only Cookies** - XSS protection
- 🛡️ **CSRF Protection** - Double-submit cookie pattern
- ⚡ **Redis Caching** - Chat history with graceful fallback
- 🚦 **Rate Limiting** - Tiered limits (auth, orders, chatbot)
- 👥 **Enhanced RBAC** - Permission-based access control
- 📊 **Security** - Helmet, CORS, input validation

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [API Testing](#api-testing)
7. [Stripe Webhook Testing](#stripe-webhook-testing)
8. [Project Structure](#project-structure)
9. [API Documentation](#api-documentation)
10. [Security Features](#security-features)

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Docker & Docker Compose** - [Download](https://www.docker.com/)
- **Stripe CLI** (for webhook testing) - Install via:
  ```bash
  brew install stripe/stripe-cli/stripe
  ```
- **Postman** (for API testing) - [Download](https://www.postman.com/)

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd SM
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Docker Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker ps

# Should show:
# - sm_postgres (port 5434)
# - sm_redis (port 6379)
```

---

## ⚙️ Environment Setup

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your configuration:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5434/sm_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secret (REQUIRED - generate a strong secret)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=3000
FRONTEND_URL="http://localhost:3000"

# Stripe (production keys)
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"  # From Stripe CLI

# PayPal (mocked - use placeholders)
PAYPAL_CLIENT_ID="placeholder"
PAYPAL_CLIENT_SECRET="placeholder"

# OpenRouter (AI Chatbot)
OPENROUTER_API_KEY="your_openrouter_api_key"
```

### 3. Get Required API Keys

#### **Stripe API Key**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_`)
3. Add to `.env` as `STRIPE_SECRET_KEY`

#### **OpenRouter API Key** (for AI Chatbot)
1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Generate an API key
3. Add to `.env` as `OPENROUTER_API_KEY`

---

## 🗄️ Database Setup

### 1. Run Migrations

```bash
npx prisma migrate dev

# This will:
# - Create database tables
# - Generate Prisma client
```

### 2. (Optional) Seed Database

```bash
npx prisma db seed
```

### 3. Verify Database

```bash
# Connect to database
docker exec -it sm_postgres psql -U user -d sm_db

# Check tables
\dt

# View schema
\d "User"
\d "Order"

# Exit
\q
```

---

## ▶️ Running the Application

### Development Mode

```bash
npm run dev

# Server will start on http://localhost:3000
```

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Verify Server is Running

```bash
# Test endpoint
curl http://localhost:3000/api/csrf/csrf-token

# Should return:
# {"csrfToken":"..."}
```

---

## 🧪 API Testing

### 1. Import Postman Collection

1. Open Postman
2. Click **Import**
3. Select `postman_collection.json` from project root
4. Collection imported with all endpoints!

### 2. Testing Workflow

#### **Step 1: Register User**

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Cookie set automatically ✅

---

#### **Step 2: Get CSRF Token**

```http
GET http://localhost:3000/api/csrf/csrf-token
```

**Response:**
```json
{
  "csrfToken": "abc123xyz..."
}
```

**Important:** Copy this token! You'll need it for all protected endpoints.

---

#### **Step 3: Create Order**

```http
POST http://localhost:3000/api/orders
Content-Type: application/json
X-CSRF-Token: abc123xyz...

{
  "items": [
    {
      "title": "MacBook Pro 16\"",
      "price": 2499.99,
      "quantity": 1
    }
  ],
  "paymentMethod": "stripe"
}
```

**Response:**
```json
{
  "order": {
    "id": "order_123...",
    "paymentStatus": "pending",
    "orderStatus": "pending"
  },
  "payment": {
    "clientSecret": "pi_xxx_secret_yyy",
    "paymentId": "pi_xxx"
  }
}
```

**Save the `order.id` for webhook testing!**

---

#### **Step 4: Chat with AI**

```http
POST http://localhost:3000/api/chatbot
Content-Type: application/json
X-CSRF-Token: abc123xyz...

{
  "message": "What laptops do you recommend?"
}
```

**Response:**
```json
{
  "reply": "Based on your needs, I recommend..."
}
```

---

## 🔌 Stripe Webhook Testing

### Setup

#### **Step 1: Login to Stripe CLI**

```bash
stripe login

# Follow the browser prompt to authenticate
```

#### **Step 2: Start Stripe Listener (Terminal 1)**

```bash
stripe listen --forward-to localhost:3000/payments/stripe/webhook

# You'll see:
# > Your webhook signing secret is whsec_xxx...
```

**IMPORTANT:** Copy the webhook secret!

#### **Step 3: Update .env**

Add the webhook secret to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx_from_stripe_cli
```

#### **Step 4: Restart Server (Terminal 2)**

```bash
# Stop server (Ctrl+C)
npm run dev

# Server must reload the new webhook secret
```

---

### Testing Webhooks

#### **Option 1: Trigger Test Event**

```bash
# Create an order first (save the order ID)
# Then trigger webhook with YOUR order ID:

stripe trigger payment_intent.succeeded \
  --override 'payment_intent:metadata[orderId]=YOUR_ORDER_ID_HERE'
```

**⚠️ Note the QUOTES around the override parameter!** (Required for zsh shell)

#### **Option 2: Use Real Payment Intent**

If you created a payment from the API:

```bash
stripe trigger payment_intent.succeeded \
  --override 'payment_intent:id=pi_xxx_from_your_order'
```

---

### Verify Webhook Success

#### **1. Check Stripe Listener (Terminal 1)**

You should see:
```
2025-11-29 16:10:00  --> payment_intent.succeeded [evt_xxx]
2025-11-29 16:10:00  <-- [200] POST /payments/stripe/webhook
```

`[200]` = Success! ✅

#### **2. Check Server Logs (Terminal 2)**

```
Webhook signature verified
Order 442fe96d-35b0-4c40-949d-345079d7bf7d updated: paid
Socket.io event emitted to user
```

#### **3. Verify Database**

```bash
docker exec -it sm_postgres psql -U user -d sm_db \
  -c "SELECT id, \"paymentStatus\", \"orderStatus\" FROM \"Order\" WHERE id = 'YOUR_ORDER_ID';"
```

**Should show:**
```
paymentStatus: "paid"
orderStatus: "processing"
```

---

## 📁 Project Structure

```
SM/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
│
├── src/
│   ├── modules/                # Feature modules
│   │   ├── auth/               # Authentication (register, login, logout)
│   │   ├── orders/             # Order management
│   │   ├── chat/               # AI chatbot
│   │   └── payment/            # Payment processing
│   │
│   ├── routes/                 # Route aggregation
│   │   ├── index.ts            # Central router
│   │   └── csrf.routes.ts      # CSRF token endpoint
│   │
│   ├── middlewares/            # Shared middleware
│   │   ├── auth.middleware.ts  # JWT authentication
│   │   ├── rbac.middleware.ts  # Permission system
│   │   ├── rateLimit.middleware.ts  # Rate limiting
│   │   ├── csrf.middleware.ts  # CSRF protection
│   │   └── error.middleware.ts # Error handling
│   │
│   ├── socket/                 # WebSocket logic
│   │   └── socket.service.ts   # Socket.io server
│   │
│   ├── config/                 # Configuration
│   │   ├── index.ts            # Environment config
│   │   └── redis.ts            # Redis client
│   │
│   ├── utils/                  # Utilities
│   │   └── prisma.ts           # Prisma client
│   │
│   ├── app.ts                  # Express app
│   └── server.ts               # Server entry point
│
├── .env                        # Environment variables (gitignored)
├── docker-compose.yml          # Docker services
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── postman_collection.json     # API testing
│
├── README.md                   # This file
├── TECHNICAL_DOCS.md           # Architecture deep-dive
├── TEST_CASES.md               # Test scenarios
├── FOLDER_STRUCTURE.md         # Structure explanation
└── COOKIE_AUTH_GUIDE.md        # Cookie auth guide
```

### Architecture Pattern

**Feature-Based Modular Structure:**
- Each module contains: controller + service + routes + DTOs
- Better scalability and maintainability
- Follows Domain-Driven Design (DDD) principles
- Used by NestJS, Angular, and enterprise applications

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

| Method | Endpoint | Description | CSRF Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ No |
| POST | `/auth/login` | Login user | ❌ No |
| POST | `/auth/logout` | Logout user | ❌ No |

### Protected Endpoints (Require Authentication)

| Method | Endpoint | Description | CSRF Required |
|--------|----------|-------------|---------------|
| GET | `/csrf/csrf-token` | Get CSRF token | ❌ No |
| POST | `/orders` | Create order | ✅ Yes |
| PATCH | `/orders/:id/status` | Update order (admin) | ✅ Yes |
| POST | `/chatbot` | Chat with AI | ✅ Yes |

### Webhook Endpoints (External Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/stripe/webhook` | Stripe payment events |
| POST | `/payments/paypal/webhook` | PayPal payment events |

---

## 🔒 Security Features

### 1. HTTP-Only Cookies
- JWT stored in secure, HTTP-only cookies
- JavaScript cannot access tokens
- **Protection:** XSS attacks

### 2. CSRF Protection
- Double-submit cookie pattern
- CSRF tokens required for state-changing operations
- **Protection:** CSRF attacks

### 3. Rate Limiting
- **Auth endpoints:** 5 requests / 15 minutes
- **Orders:** 20 requests / minute
- **Chatbot:** 10 requests / minute
- **General:** 100 requests / 15 minutes

### 4. RBAC (Role-Based Access Control)
- Granular permission system
- Roles: `guest`, `user`, `admin`, `super_admin`
- Permissions: `orders:create`, `orders:read`, `orders:update`, etc.

### 5. Additional Security
- Helmet.js (security headers)
- CORS configuration
- Input validation (Zod schemas)
- Webhook signature verification

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Install & Setup
npm install
docker-compose up -d
cp .env.example .env
# Edit .env with your keys

# 2. Database
npx prisma migrate dev

# 3. Start Server
npm run dev

# 4. Test in Postman
# Import postman_collection.json
# Register → Get CSRF Token → Create Order

# 5. Test Webhooks (Optional)
# Terminal 1: stripe listen --forward-to localhost:3000/payments/stripe/webhook
# Terminal 2: npm run dev
# Terminal 3: stripe trigger payment_intent.succeeded --override 'payment_intent:metadata[orderId]=ORDER_ID'
```

---

## 📖 Additional Documentation

- **[TECHNICAL_DOCS.md](TECHNICAL_DOCS.md)** - Deep dive into architecture, middleware, and flows
- **[TEST_CASES.md](TEST_CASES.md)** - Comprehensive test scenarios and expected results
- **[COOKIE_AUTH_GUIDE.md](COOKIE_AUTH_GUIDE.md)** - HTTP-only cookie implementation guide
- **[FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)** - Architecture explanation and comparison

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check if Docker container is running
docker ps

# Restart containers
docker-compose restart

# Check logs
docker logs sm_postgres
```

### Webhook Signature Error
```bash
# Ensure webhook secret in .env matches Stripe CLI output
# Restart server after updating .env
npm run dev
```

### CSRF Token Invalid
```bash
# Get fresh CSRF token after login
GET /api/csrf/csrf-token

# Use token in X-CSRF-Token header
```

### Redis Connection Issues
```bash
# Redis is optional - app falls back to memory
# Check Redis is running:
docker exec -it sm_redis redis-cli ping
# Should return: PONG
```

---

## 🚀 Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production database URL
- [ ] Add production Stripe keys
- [ ] Set correct `FRONTEND_URL` for CORS
- [ ] Enable HTTPS (cookies require `secure: true`)
- [ ] Set up production Redis instance
- [ ] Configure Stripe production webhooks
- [ ] Run database migrations
- [ ] Set up environment variables on hosting platform

---

## 👨‍💻 Author

Kutubuddin Juwel

---

## 🙏 Acknowledgments

- Stripe for payment processing
- OpenRouter for AI integration
- Prisma for database ORM
- Socket.io for real-time features

---

**Built with  using TypeScript, Express, and modern best practices.**
