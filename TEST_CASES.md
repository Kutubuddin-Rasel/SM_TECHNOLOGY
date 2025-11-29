# System Test Cases & Workflows

## Table of Contents
1. [Setup Instructions](#setup-instructions)
2. [Test Scenario 1: Complete User Journey](#test-scenario-1-complete-user-journey)
3. [Test Scenario 2: Admin Operations](#test-scenario-2-admin-operations)
4. [Test Scenario 3: AI Chatbot with Context](#test-scenario-3-ai-chatbot-with-context)
5. [Test Scenario 4: Real-Time Updates (Socket.io)](#test-scenario-4-real-time-updates)
6. [Test Scenario 5: Security & Rate Limiting](#test-scenario-5-security--rate-limiting)
7. [Test Scenario 6: Payment Webhook Testing](#test-scenario-6-payment-webhook-testing)
8. [Test Scenario 7: RBAC (Permission System)](#test-scenario-7-rbac-permission-system)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Setup Instructions

### Prerequisites
1. **Start Services:**
   ```bash
   # Terminal 1: Start Docker containers
   docker-compose up -d
   
   # Terminal 2: Run database migrations
   npx prisma migrate dev
   
   # Terminal 3: Start server
   npm run dev
   ```

2. **Verify Running:**
   - Server: http://localhost:3000
   - PostgreSQL: localhost:5434
   - Redis: localhost:6379

3. **Import Postman Collection:**
   - Open Postman
   - Import `postman_collection.json`
   - Collection auto-manages JWT tokens

---

## Test Scenario 1: Complete User Journey

### **Goal:** Test the full workflow from registration to order completion

#### Step 1.1: Register Regular User

**Request:**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "cm4abc123...",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2025-01-15T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ Verify:**
- Status: 201 Created
- Token is present
- User role is `"user"` (not admin)
- Save token for next steps

---

#### Step 1.2: Login User

**Request:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Expected Response (200):**
```json
{
  "user": {
    "id": "cm4abc123...",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ Verify:**
- Same user ID as registration
- New token generated
- Can login with correct credentials

---

#### Step 1.3: Create Order (Stripe Payment)

**Request:**
```http
POST http://localhost:3000/api/orders
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "items": [
    {
      "title": "MacBook Pro 16\"",
      "price": 2499.99,
      "quantity": 1
    },
    {
      "title": "Magic Mouse",
      "price": 99.99,
      "quantity": 2
    }
  ],
  "paymentMethod": "stripe"
}
```

**Expected Response (201):**
```json
{
  "order": {
    "id": "cm4order123...",
    "userId": "cm4abc123...",
    "totalAmount": 2699.97,
    "paymentMethod": "stripe",
    "paymentStatus": "pending",
    "orderStatus": "pending",
    "createdAt": "2025-01-15T10:05:00.000Z",
    "items": [
      {
        "id": "cm4item1...",
        "title": "MacBook Pro 16\"",
        "price": 2499.99,
        "quantity": 1
      },
      {
        "id": "cm4item2...",
        "title": "Magic Mouse",
        "price": 99.99,
        "quantity": 2
      }
    ]
  },
  "payment": {
    "clientSecret": "pi_xxx_secret_yyy",
    "paymentId": "pi_xxx"
  }
}
```

**✅ Verify:**
- Order created with correct total: $2699.97
- Payment status: `"pending"`
- Order status: `"pending"`
- Stripe `clientSecret` returned
- Save `order.id` and `order.userId`

---

#### Step 1.4: Chat with AI (First Message)

**Request:**
```http
POST http://localhost:3000/api/chatbot
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "message": "What products do you recommend for a developer?"
}
```

**Expected Response (200):**
```json
{
  "reply": "For developers, I recommend our MacBook Pro lineup with powerful processors, mechanical keyboards for comfortable typing, and our 4K monitors for extended coding sessions..."
}
```

**✅ Verify:**
- Intelligent response related to question
- Response is coherent and contextual

---

#### Step 1.5: Chat with AI (Follow-up - Testing Context)

**Request:**
```http
POST http://localhost:3000/api/chatbot
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "message": "Tell me more about the MacBook you mentioned"
}
```

**Expected Response (200):**
```json
{
  "reply": "The MacBook Pro I mentioned earlier features M3 chip, up to 64GB RAM, excellent battery life of 18+ hours, and a stunning Retina display perfect for coding..."
}
```

**✅ Verify:**
- AI remembers previous conversation ("the MacBook you mentioned")
- Context is maintained
- Response builds on previous answer

---

## Test Scenario 2: Admin Operations

### **Goal:** Test admin-only functionalities

#### Step 2.1: Register Admin User

**Request:**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "AdminPass123!"
}
```

**Manual Step Required:**
After registration, manually update the user's role in the database:

```bash
# Connect to database
docker exec -it sm_postgres psql -U user -d sm_db

# Update user role
UPDATE "User" SET role = 'admin' WHERE email = 'admin@example.com';

# Verify
SELECT id, email, role FROM "User";

# Exit
\q
```

**Then Login:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "AdminPass123!"
}
```

**Expected Response:**
```json
{
  "user": {
    "id": "cm4admin123...",
    "email": "admin@example.com",
    "role": "admin"  ← IMPORTANT
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ Verify:**
- Role is `"admin"`
- Save admin token

---

#### Step 2.2: Admin Updates Order Status

**Request:**
```http
PATCH http://localhost:3000/api/orders/<ORDER_ID>/status
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "orderStatus": "shipped"
}
```

**Expected Response (200):**
```json
{
  "id": "cm4order123...",
  "userId": "cm4abc123...",
  "totalAmount": 2699.97,
  "paymentMethod": "stripe",
  "paymentStatus": "pending",
  "orderStatus": "shipped",  ← Updated
  "createdAt": "2025-01-15T10:05:00.000Z",
  "updatedAt": "2025-01-15T10:15:00.000Z"
}
```

**✅ Verify:**
- Order status updated to `"shipped"`
- `updatedAt` timestamp changed
- Socket.io event emitted (check Step 4)

---

#### Step 2.3: Regular User CANNOT Update Order Status

**Request:**
```http
PATCH http://localhost:3000/api/orders/<ORDER_ID>/status
Authorization: Bearer <USER_TOKEN>  ← Regular user token
Content-Type: application/json

{
  "orderStatus": "cancelled"
}
```

**Expected Response (403):**
```json
{
  "error": "Insufficient permissions",
  "required": "orders:update",
  "role": "user"
}
```

**✅ Verify:**
- Status: 403 Forbidden
- RBAC working correctly
- User role lacks `orders:update` permission

---

## Test Scenario 3: AI Chatbot with Context

### **Goal:** Test conversation context and memory

#### Step 3.1: Start New Conversation

**Request 1:**
```http
POST http://localhost:3000/api/chatbot
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "message": "What laptops do you have under $1500?"
}
```

**Expected:** AI lists affordable laptops.

---

#### Step 3.2: Follow-up Question (Context Test)

**Request 2 (immediately after):**
```http
POST http://localhost:3000/api/chatbot
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "message": "Which of those has the best battery life?"
}
```

**✅ Verify:**
- AI refers to "those" laptops from previous message
- Doesn't ask "which laptops?"
- Context maintained

---

#### Step 3.3: Another Follow-up

**Request 3:**
```http
POST http://localhost:3000/api/chatbot
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "message": "Tell me the specs of the first one you mentioned"
}
```

**✅ Verify:**
- AI remembers the order of recommendations
- References specific laptop from earlier

---

#### Step 3.4: Test Context Limit (7th Message)

After 6 messages (3 exchanges), make a 7th request referencing the FIRST message.

**Request 7:**
```http
POST http://localhost:3000/api/chatbot
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "message": "Going back to the under $1500 laptops you first mentioned..."
}
```

**✅ Verify:**
- If AI remembers: Context window > 6 (not expected)
- If AI asks for clarification: Context window = 6 ✅ (correct)

---

## Test Scenario 4: Real-Time Updates (Socket.io)

### **Goal:** Test WebSocket real-time notifications

#### Step 4.1: Setup Socket.io Client

**Manual Test (Browser Console or Node.js):**

```javascript
// Option 1: Browser (include socket.io-client CDN first)
const socket = io('http://localhost:3000', {
    query: { token: '<USER_JWT_TOKEN>' }
});

socket.on('connect', () => {
    console.log('✅ Connected to server');
});

socket.on('orderUpdate', (data) => {
    console.log('📦 Order Update Received:', data);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});
```

---

#### Step 4.2: Trigger Update (Admin Changes Order)

**While Socket.io client is connected:**

```http
PATCH http://localhost:3000/api/orders/<ORDER_ID>/status
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "orderStatus": "delivered"
}
```

**✅ Verify (in Browser Console):**
```
📦 Order Update Received: {
  orderId: "cm4order123...",
  orderStatus: "delivered",
  paymentStatus: "pending"
}
```

**Real-time test successful if:**
- Update received INSTANTLY (< 1 second)
- No need to refresh or poll
- Data matches order update

---

## Test Scenario 5: Security & Rate Limiting

### **Goal:** Test security features and rate limits

#### Step 5.1: Test Authentication Required

**Request (NO TOKEN):**
```http
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "items": [{"title": "Test", "price": 10, "quantity": 1}],
  "paymentMethod": "stripe"
}
```

**Expected Response (401):**
```json
{
  "error": "Authentication required"
}
```

**✅ Verify:**
- Cannot access protected route without token
- Status: 401 Unauthorized

---

#### Step 5.2: Test Invalid Token

**Request (BAD TOKEN):**
```http
POST http://localhost:3000/api/orders
Authorization: Bearer invalid_token_12345
Content-Type: application/json

{
  "items": [{"title": "Test", "price": 10, "quantity": 1}],
  "paymentMethod": "stripe"
}
```

**Expected Response (401):**
```json
{
  "error": "Invalid token"
}
```

**✅ Verify:**
- Invalid tokens rejected
- JWT verification working

---

#### Step 5.3: Test Auth Rate Limiting

**Goal:** Trigger auth rate limit (5 requests / 15 minutes)

**Repeat 6 times quickly:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "wrong@example.com",
  "password": "wrongpassword"
}
```

**Request 1-5:** Should get 401 or 400 (wrong credentials)

**Request 6:** Should get:
```json
{
  "message": "Too many authentication attempts, please try again later."
}
```

**Response Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705318800
Retry-After: 900
```

**✅ Verify:**
- 6th request blocked with 429
- Rate limit headers present
- Must wait ~15 minutes OR restart server

---

#### Step 5.4: Test Chatbot Rate Limiting

**Goal:** Trigger chatbot limit (10 requests / minute)

**Send 11 requests rapidly:**
```http
POST http://localhost:3000/api/chatbot
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "message": "Test message {{$randomInt}}"
}
```

**Requests 1-10:** Normal responses

**Request 11:**
```json
{
  "message": "Too many chatbot requests, please slow down."
}
```

**✅ Verify:**
- 11th request gets 429
- Rate limit is per minute (resets faster than auth)

---

## Test Scenario 6: Payment Webhook Testing

### **Goal:** Test Stripe webhook integration

#### Step 6.1: Setup Stripe CLI (Local Testing)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/payments/stripe/webhook
```

**You'll see:**
```
> Ready! Your webhook signing secret is whsec_xxx...
```

**Copy the `whsec_xxx` to your `.env`:**
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

**Restart server** to load new secret.

---

#### Step 6.2: Create Order

```http
POST http://localhost:3000/api/orders
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "items": [
    {"title": "iPhone 15 Pro", "price": 999, "quantity": 1}
  ],
  "paymentMethod": "stripe"
}
```

**Save:** `order.id` and `payment.paymentId`

---

#### Step 6.3: Simulate Successful Payment

```bash
stripe trigger payment_intent.succeeded --override payment_intent:metadata[orderId]=<ORDER_ID>
```

**✅ Verify in Server Logs:**
```
Webhook signature verified
Order cm4order123... updated: paid
Socket.io event emitted to user
```

**✅ Verify in Database:**
```sql
SELECT id, "paymentStatus", "orderStatus" FROM "Order" WHERE id = '<ORDER_ID>';
```

Should show:
```
paymentStatus: "paid"
orderStatus: "processing"
```

**✅ Verify Socket.io:**
If client connected, should receive:
```json
{
  "orderId": "cm4order123...",
  "paymentStatus": "paid",
  "orderStatus": "processing"
}
```

---

## Test Scenario 7: RBAC (Permission System)

### **Goal:** Test granular permission system

#### Step 7.1: User Can Create Orders

```http
POST http://localhost:3000/api/orders
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "items": [{"title": "Test", "price": 50, "quantity": 1}],
  "paymentMethod": "stripe"
}
```

**Expected:** 201 Created ✅
**Reason:** User has `orders:create` permission

---

#### Step 7.2: User CANNOT Update Orders

```http
PATCH http://localhost:3000/api/orders/<ORDER_ID>/status
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "orderStatus": "cancelled"
}
```

**Expected:** 403 Forbidden ✅
**Reason:** User lacks `orders:update` permission

---

#### Step 7.3: Admin CAN Update Orders

```http
PATCH http://localhost:3000/api/orders/<ORDER_ID>/status
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "orderStatus": "cancelled"
}
```

**Expected:** 200 OK ✅
**Reason:** Admin has `orders:update` permission

---

## Edge Cases & Error Handling

### Test Case 8.1: Duplicate Registration

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",  ← Already exists
  "password": "AnotherPass123!"
}
```

**Expected (400):**
```json
{
  "error": "User already exists"
}
```

---

### Test Case 8.2: Wrong Login Credentials

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "WrongPassword"
}
```

**Expected (400/401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### Test Case 8.3: Order with Negative Quantity

```http
POST http://localhost:3000/api/orders
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "items": [
    {"title": "Laptop", "price": 999, "quantity": -5}
  ],
  "paymentMethod": "stripe"
}
```

**Expected:** Should validate and reject (add Zod validation if needed)

---

### Test Case 8.4: Empty Chat Message

```http
POST http://localhost:3000/api/chatbot
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "message": ""
}
```

**Expected:** Validation error or default response

---

## Complete Test Workflow (Quick Run)

### **30-Second Smoke Test:**

```bash
# 1. Register
POST /api/auth/register { email, password }

# 2. Login (save token)
POST /api/auth/login { email, password }

# 3. Create Order
POST /api/orders (with token)

# 4. Chat
POST /api/chatbot (with token) { message: "Hello" }

# 5. Verify all 200/201 responses
```

---

## Success Criteria Checklist

- [ ] **Authentication**
  - [ ] User can register
  - [ ] User can login
  - [ ] JWT token generated
  - [ ] Invalid credentials rejected

- [ ] **Orders**
  - [ ] User can create orders
  - [ ] Stripe payment intent created
  - [ ] Order saved with pending status

- [ ] **Admin**
  - [ ] Admin can update order status
  - [ ] Regular user CANNOT update orders
  - [ ] RBAC enforced

- [ ] **Chat**
  - [ ] AI responds intelligently
  - [ ] Context maintained (3 exchanges)
  - [ ] Conversation history saved

- [ ] **Real-Time**
  - [ ] Socket.io connection works
  - [ ] Order updates received instantly
  - [ ] Multiple tabs supported

- [ ] **Security**
  - [ ] Rate limiting works (auth, chat, orders)
  - [ ] Invalid tokens rejected
  - [ ] Protected routes blocked without auth

- [ ] **Webhooks**
  - [ ] Stripe webhook verified
  - [ ] Order status updated on payment
  - [ ] Socket.io event emitted

---

## Testing Tools

### Recommended Setup

1. **Postman:** API testing (import `postman_collection.json`)
2. **Browser Console:** Socket.io testing
3. **Stripe CLI:** Webhook testing
4. **Redis CLI:** Check cached data
5. **PostgreSQL:** Verify database updates

### Postman Environment Variables

Create environment with:
```
user_token: <from login>
admin_token: <from admin login>
order_id: <from create order>
base_url: http://localhost:3000
```

---

## Troubleshooting

### Issue: Rate limit stuck
**Solution:** Restart server OR wait for window to reset OR flush Redis
```bash
docker exec -it sm_redis redis-cli FLUSHALL
```

### Issue: Socket.io not connecting
**Solution:** Check JWT token in query param, verify server running

### Issue: Webhook not working
**Solution:** Ensure Stripe CLI running, check webhook secret in .env

### Issue: Chat no context
**Solution:** Check Redis connection, verify TTL not expired

---

## Final Notes

✅ **All test cases should pass** for a production-ready system  
✅ **Document any failures** and fix before submission  
✅ **Expected time:** 30-45 minutes for complete testing  
✅ **Share this document** with reviewers along with Postman collection  

**Your system is ready for demonstration!** 🚀
