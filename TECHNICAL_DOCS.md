# Technical Architecture Documentation

## Table of Contents
1. [Middleware System](#middleware-system)
2. [Chat System (AI Integration)](#chat-system)
3. [Payment System](#payment-system)
4. [WebSocket (Socket.io)](#websocket-system)
5. [Complete Flow Diagrams](#complete-flow-diagrams)

---

## 1. Middleware System

### 1.1 Authentication Middleware

**File:** [`src/middlewares/auth.middleware.ts`](file:///Users/kutubuddin/Downloads/SM/src/middlewares/auth.middleware.ts)

#### Purpose
Validates JWT tokens and attaches user information to requests.

#### How It Works

```typescript
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Step 1: Extract token from HTTP-only cookie
    const token = req.cookies?.token;
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Step 2: Verify JWT signature using secret
        const decoded = jwt.verify(token, config.auth.jwtSecret) as { id: string; role: string };
        
        // Step 3: Attach user info to request object
        req.user = decoded;
        
        // Step 4: Continue to next middleware/route handler
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
```

#### Flow Diagram

```
Client Login/Register
    ↓
Server validates credentials
    ↓
Generate JWT token
    ↓
Set HTTP-only cookie
    res.cookie('token', jwt, {
        httpOnly: true,      // JavaScript cannot access
        secure: true,        // HTTPS only (production)
        sameSite: 'strict',  // CSRF protection
        maxAge: 24h          // Auto-expire
    })
    ↓
Browser stores cookie automatically
    ↓
────────────────────────────────────
Subsequent Request with Cookie
    ↓
Extract token from req.cookies
    ↓
Token exists? ──NO──> 401 Unauthorized
    ↓ YES
Verify JWT with secret
    ↓
Valid? ──NO──> 401 Invalid Token
    ↓ YES
Decode payload { id, role }
    ↓
Attach to req.user
    ↓
Call next() → Continue to route handler
```

---

### 1.2 RBAC Middleware (Role-Based Access Control)

**File:** [`src/middlewares/rbac.middleware.ts`](file:///Users/kutubuddin/Downloads/SM/src/middlewares/rbac.middleware.ts)

#### Role Hierarchy

```
guest → user → admin → super_admin
(least privileges)    (most privileges)
```

#### Permission System

```typescript
const rolePermissions: Record<Role, Permission[]> = {
    [Role.GUEST]: [],
    [Role.USER]: [
        Permission.ORDERS_CREATE,
        Permission.ORDERS_READ,
        Permission.CHAT_ACCESS,
    ],
    [Role.ADMIN]: [
        Permission.ORDERS_CREATE,
        Permission.ORDERS_READ,
        Permission.ORDERS_UPDATE,  // ← Can update orders
        Permission.CHAT_ACCESS,
    ],
    [Role.SUPER_ADMIN]: [
        // All permissions including DELETE
    ],
};
```

#### Two Types of Checks

**1. Role-Based:**
```typescript
requireRole(Role.ADMIN, Role.SUPER_ADMIN)
// Allows: admin OR super_admin
// Rejects: user, guest
```

**2. Permission-Based:**
```typescript
requirePermission(Permission.ORDERS_UPDATE)
// Checks if user's role HAS this permission
// More granular than role checks
```

#### Flow Example

```
Request to PATCH /orders/:id/status
    ↓
authenticate middleware runs first
    ↓
req.user = { id: "123", role: "user" }
    ↓
requirePermission(Permission.ORDERS_UPDATE) runs
    ↓
Check: Does "user" role have "orders:update"?
    ↓
rolePermissions["user"] = [orders:create, orders:read, chat:access]
    ↓
"orders:update" NOT in list
    ↓
403 Forbidden { error: "Insufficient permissions", required: "orders:update", role: "user" }
```

---

### 1.3 Rate Limiting Middleware

**File:** [`src/middlewares/rateLimit.middleware.ts`](file:///Users/kutubuddin/Downloads/SM/src/middlewares/rateLimit.middleware.ts)

#### Configuration

```typescript
config.rateLimit = {
    general: { windowMs: 15 * 60 * 1000, max: 100 },  // 100 req / 15 min
    auth: { windowMs: 15 * 60 * 1000, max: 5 },       // 5 req / 15 min
    chatbot: { windowMs: 60 * 1000, max: 10 },        // 10 req / 1 min
    orders: { windowMs: 60 * 1000, max: 20 },         // 20 req / 1 min
};
```

#### Redis Store Integration

```typescript
const createRedisStore = () => {
    const client = getRedisClient();
    return client 
        ? new RedisStore({ sendCommand: (...args) => client.sendCommand(args) })
        : undefined;  // Falls back to memory if Redis unavailable
};
```

#### How It Works

```
Request from IP: 192.168.1.1
    ↓
Rate limiter checks Redis: "rl:auth:192.168.1.1"
    ↓
Current count: 4 (within 15 min window)
    ↓
Increment to 5
    ↓
Max is 5 → ALLOWED (but at limit)
    ↓
Response includes headers:
    X-RateLimit-Limit: 5
    X-RateLimit-Remaining: 0
    X-RateLimit-Reset: <timestamp>
    ↓
Next request from same IP
    ↓
Count: 6 → EXCEEDS max
    ↓
429 Too Many Requests
    Retry-After: <seconds until reset>
```

#### Distributed Rate Limiting

**With Redis:**
```
Server 1: User makes 3 requests → Redis: count = 3
Server 2: Same user makes 2 requests → Redis: count = 5
Server 3: User tries 1 more → Redis: count would be 6 → BLOCKED
```

**Without Redis (memory):**
```
Server 1: count = 3 (only knows about its own requests)
Server 2: count = 2 (separate counter)
Server 3: count = 1 (separate counter)
Total = 6, but no server blocks (not distributed)
```

---

### 1.4 Error Handling Middleware

**File:** [`src/middlewares/error.middleware.ts`](file:///Users/kutubuddin/Downloads/SM/src/middlewares/error.middleware.ts)

```typescript
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: err.message 
    });
};
```

#### Placement
Must be **last** in middleware chain:

```typescript
app.use('/api', routes);
app.use(errorHandler);  // ← Catches all errors from above
```

---

### 1.5 CSRF Protection Middleware

**File:** [`src/middlewares/csrf.middleware.ts`](file:///Users/kutubuddin/Downloads/SM/src/middlewares/csrf.middleware.ts)

#### Purpose
Prevents Cross-Site Request Forgery (CSRF) attacks when using cookie-based authentication.

#### How It Works

```typescript
const csrfProtectionInstance = doubleCsrf({
    getSecret: () => config.auth.jwtSecret,
    cookieName: 'csrf-token',
    cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
    },
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getSessionIdentifier: (req) => req.cookies?.token || req.ip || 'anonymous',
});
```

#### Double-Submit Cookie Pattern

```
Client Workflow:
    ↓
1. GET /api/csrf/csrf-token
   Server generates CSRF token
   Sets cookie: csrf-token=<random>
   Returns: { csrfToken: "<random>" }
    ↓
2. Client stores token in variable
    ↓
3. POST /api/orders
   Cookie: csrf-token=<random>  (automatic)
   Header: X-CSRF-Token: <random>  (manual)
    ↓
4. Server validates:
   - Cookie value matches header value?
   - Both signed with secret?
    ↓
5. If match: Process request ✅
   If no match: 403 Forbidden ❌
```

#### Why CSRF Protection?

**Without CSRF (Vulnerable):**
```html
<!-- Attacker's malicious website -->
<form action="https://yoursite.com/api/orders" method="POST">
    <input type="hidden" name="items" value="steal_money">
</form>
<script>
    // Browser automatically sends cookie!
    document.forms[0].submit();  // ❌ Attack succeeds
</script>
```

**With CSRF (Protected):**
```
Attacker site tries same attack
    ↓
Browser sends cookie (automatic)
    ↓
BUT: Attacker cannot set X-CSRF-Token header
    ↓
Server checks: Cookie present, Header missing
    ↓
403 Forbidden ✅
```

#### Integration

```typescript
// app.ts
app.use('/api', csrfProtection, routes);  // CSRF on all /api routes
```

**Excluded:** Webhooks don't need CSRF (external services, not browsers)



## 2. Chat System (AI Integration)

**Files:** 
- [`src/modules/chat/chat.service.ts`](file:///Users/kutubuddin/Downloads/SM/src/modules/chat/chat.service.ts)
- [`src/modules/chat/chat.controller.ts`](file:///Users/kutubuddin/Downloads/SM/src/modules/chat/chat.controller.ts)

### 2.1 Architecture Overview

```
User Request
    ↓
Controller (validates input)
    ↓
Service Layer
    ↓
┌────────────────┐
│ Get History    │ ← Redis (persistent)
│ from Redis     │   OR
│ or Memory      │   Memory (fallback)
└────────────────┘
    ↓
Build message context
    ↓
┌────────────────┐
│ OpenRouter API │ → Grok 4.1 Fast
│ (AI Provider)  │
└────────────────┘
    ↓
AI Response
    ↓
┌────────────────┐
│ Update History │ → Save to Redis/Memory
│ (keep last 6   │   (3 user + 3 assistant)
│  messages)     │
└────────────────┘
    ↓
Return to User
```

### 2.2 Detailed Code Flow

#### Step 1: Retrieve Chat History

```typescript
const getChatHistory = async (userId: string) => {
    const redis = getRedisClient();
    
    if (redis) {
        try {
            const key = `chat:history:${userId}`;
            const data = await redis.get(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Redis get error, using memory fallback:', error);
        }
    }
    
    // Fallback to in-memory Map
    return memoryCache.get(userId) || [];
};
```

**Redis Key Pattern:** `chat:history:<userId>`

**Example:**
```
chat:history:user_123 → [
    { role: "user", content: "What products do you have?" },
    { role: "assistant", content: "We have electronics, clothing..." },
]
```

#### Step 2: Construct AI Request

```typescript
const messages = [
    {
        role: 'system',
        content: 'You are a helpful assistant for an e-commerce store.'
    },
    ...history,  // Previous conversation
    {
        role: 'user',
        content: message  // Current question
    }
];
```

**Example Messages Array:**
```json
[
    { "role": "system", "content": "You are a helpful assistant..." },
    { "role": "user", "content": "What products do you have?" },
    { "role": "assistant", "content": "We have electronics..." },
    { "role": "user", "content": "Tell me about laptops" }  ← New message
]
```

#### Step 3: Call OpenRouter API

```typescript
const response = await fetch(config.openrouter.apiUrl, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SM Backend Chatbot'
    },
    body: JSON.stringify({
        model: config.openrouter.model,  // 'x-ai/grok-4.1-fast:free'
        messages: messages,
        max_tokens: config.chat.maxTokens  // 150
    })
});
```

**API Response Structure:**
```json
{
    "choices": [
        {
            "message": {
                "role": "assistant",
                "content": "We have several laptop options including..."
            }
        }
    ]
}
```

#### Step 4: Update History (Context Window)

```typescript
history.push({ role: 'user', content: message });
history.push({ role: 'assistant', content: reply });

// Keep only last 6 messages (3 exchanges)
if (history.length > 6) {
    history.splice(0, history.length - 6);
}

await saveChatHistory(userId, history);
```

**Why limit to 6?**
- Keeps context manageable
- Reduces API costs (fewer tokens)
- Maintains relevance (recent conversation)

#### Step 5: Save to Redis with TTL

```typescript
const saveChatHistory = async (userId, history) => {
    const redis = getRedisClient();
    
    if (redis) {
        const key = `chat:history:${userId}`;
        await redis.setEx(key, config.chat.historyTTL, JSON.stringify(history));
        // TTL = 86400 seconds (24 hours)
    } else {
        memoryCache.set(userId, history);
    }
};
```

**Auto-Expiration:**
After 24 hours, Redis automatically deletes the key → Fresh start for next conversation.

---

### 2.3 Complete Chat Flow Example

```
1. User sends: "What laptops do you have?"
   ↓
2. Get history from Redis: []
   ↓
3. Build messages:
   [
     { system: "You are helpful assistant..." },
     { user: "What laptops do you have?" }
   ]
   ↓
4. Call OpenRouter API → Grok processes
   ↓
5. AI responds: "We have Dell XPS, MacBook Pro..."
   ↓
6. Update history:
   [
     { user: "What laptops do you have?" },
     { assistant: "We have Dell XPS, MacBook Pro..." }
   ]
   ↓
7. Save to Redis with 24h TTL
   ↓
8. Return to user

---

User sends: "Tell me about the MacBook"
   ↓
Get history: [previous exchange]
   ↓
Build messages:
   [
     { system: "..." },
     { user: "What laptops..." },
     { assistant: "We have Dell XPS, MacBook..." },
     { user: "Tell me about the MacBook" }  ← AI has context!
   ]
   ↓
AI responds with MacBook details (knows context)
   ↓
Update and save history...
```

---

## 3. Payment System

**Files:**
- [`src/modules/payment/payment.service.ts`](file:///Users/kutubuddin/Downloads/SM/src/modules/payment/payment.service.ts)
- [`src/modules/payment/payment.webhook.ts`](file:///Users/kutubuddin/Downloads/SM/src/modules/payment/payment.webhook.ts)

### 3.1 Payment Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Create Order
       ↓
┌─────────────────┐
│ Order Controller│
└──────┬──────────┘
       │ 2. Save to DB
       ↓
┌─────────────┐     3. Initialize Payment
│ Order Saved ├────────────────────────┐
└─────────────┘                        │
                                       ↓
                            ┌──────────────────┐
                            │ Payment Service  │
                            └────────┬─────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              │                                           │
         Stripe?                                      PayPal?
              │                                           │
              ↓                                           ↓
    ┌──────────────────┐                      ┌──────────────────┐
    │ Stripe API       │                      │ PayPal API       │
    │ Create Intent    │                      │ Create Order     │
    └────────┬─────────┘                      └────────┬─────────┘
             │                                          │
             │ 4. Return client_secret                  │ 4. Return approval_url
             ↓                                          ↓
    ┌──────────────────┐                      ┌──────────────────┐
    │ Client confirms  │                      │ Client approves  │
    │ on Stripe.js     │                      │ on PayPal        │
    └────────┬─────────┘                      └────────┬─────────┘
             │                                          │
             │ 5. Payment succeeds                      │ 5. Payment captured
             ↓                                          ↓
    ┌──────────────────┐                      ┌──────────────────┐
    │ Stripe Webhook   │                      │ PayPal Webhook   │
    └────────┬─────────┘                      └────────┬─────────┘
             │                                          │
             └──────────────────┬───────────────────────┘
                                │ 6. Update order status
                                ↓
                     ┌──────────────────────┐
                     │ Database: Order      │
                     │ paymentStatus: paid  │
                     │ orderStatus: processing │
                     └──────────┬───────────┘
                                │ 7. Emit Socket.io event
                                ↓
                     ┌──────────────────────┐
                     │ User receives        │
                     │ real-time update     │
                     └──────────────────────┘
```

### 3.2 Stripe Payment Flow (Detailed)

#### Phase 1: Initialize Payment

**Request:**
```http
POST /api/orders
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "items": [
    { "title": "Laptop", "price": 999.99, "quantity": 1 }
  ],
  "paymentMethod": "stripe"
}
```

**Order Service:**
```typescript
export const createOrder = async (data: CreateOrderDto) => {
    // Calculate total
    const totalAmount = data.items.reduce((sum, item) => 
        sum + item.price * item.quantity, 0
    );
    
    // Create order in database
    const order = await prisma.order.create({
        data: {
            userId: data.userId,
            totalAmount,
            paymentMethod: data.paymentMethod,
            items: { create: data.items }
        }
    });
    
    // Initialize payment
    const paymentResponse = await paymentService.initiatePayment(
        totalAmount, 
        data.paymentMethod, 
        order.id
    );
    
    return { order, payment: paymentResponse };
};
```

**Payment Service (Stripe):**
```typescript
export const initiatePayment = async (amount, paymentMethod, orderId) => {
    if (paymentMethod === 'stripe') {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),  // $999.99 → 99999 cents
            currency: 'usd',
            metadata: { orderId }  // ← CRITICAL: Links payment to order
        });
        
        return {
            clientSecret: paymentIntent.client_secret,
            paymentId: paymentIntent.id
        };
    }
};
```

**Response to Client:**
```json
{
  "order": {
    "id": "order_abc123",
    "totalAmount": 999.99,
    "paymentStatus": "pending",
    "orderStatus": "pending"
  },
  "payment": {
    "clientSecret": "pi_xxx_secret_yyy",
    "paymentId": "pi_xxx"
  }
}
```

#### Phase 2: Client Confirms Payment

**Client-side (Not part of backend, but important):**
```javascript
// Using Stripe.js on frontend
const { error } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
        card: cardElement,
        billing_details: { name: 'John Doe' }
    }
});
```

#### Phase 3: Webhook Notification

**Stripe sends webhook:**
```http
POST /payments/stripe/webhook
Stripe-Signature: t=xxx,v1=yyy

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 99999,
      "metadata": {
        "orderId": "order_abc123"  ← Our order ID!
      }
    }
  }
}
```

**Webhook Handler:**
```typescript
export const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Verify webhook signature (security!)
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            config.stripe.webhookSecret
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
            // Update database
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentStatus: 'paid',
                    orderStatus: 'processing'
                }
            });

            // Notify user via Socket.io
            const order = await prisma.order.findUnique({ where: { id: orderId } });
            if (order) {
                emitToUser(order.userId, 'orderUpdate', { 
                    orderId, 
                    paymentStatus: 'paid', 
                    orderStatus: 'processing' 
                });
            }
        }
    }

    res.json({ received: true });
};
```

### 3.3 Why Webhooks?

**Without Webhooks (Polling - BAD):**
```
Client creates order
    ↓
Client calls GET /orders/:id every 2 seconds
    ↓
"Is it paid yet?" → No
"Is it paid yet?" → No
"Is it paid yet?" → No
"Is it paid yet?" → Yes!

Problems:
- Many unnecessary API calls
- Delayed notification (up to 2 seconds)
- Server load
```

**With Webhooks (Event-Driven - GOOD):**
```
Client creates order
    ↓
Client waits on Socket.io connection
    ↓
[User confirms payment on Stripe]
    ↓
Stripe → Webhook → Update DB → Socket.io → Client notified INSTANTLY

Benefits:
- Real-time (< 1 second)
- No polling needed
- Efficient
```

---

## 4. WebSocket System (Socket.io)

**File:** [`src/socket/socket.service.ts`](file:///Users/kutubuddin/Downloads/SM/src/socket/socket.service.ts)

### 4.1 Architecture

```
┌──────────────┐
│   Client     │
│  (Browser)   │
└──────┬───────┘
       │ 1. Connect with JWT
       │    ?token=<jwt>
       ↓
┌──────────────────┐
│ Socket.io Server │ ← Authenticates via middleware
└──────┬───────────┘
       │ 2. Connection authenticated
       │    socket.data.userId = "user_123"
       ↓
┌──────────────────┐
│ Connected Socket │ ← Stored in memory
│ User: user_123   │
└──────────────────┘

... Time passes ...

┌──────────────────┐
│ Payment Webhook  │
│ Order paid!      │
└──────┬───────────┘
       │ 3. Emit event
       │    emitToUser("user_123", "orderUpdate", {...})
       ↓
┌──────────────────┐
│ Find all sockets │
│ for user_123     │
└──────┬───────────┘
       │ 4. Send event to socket
       ↓
┌──────────────────┐
│ Client receives  │
│ event instantly  │
└──────────────────┘
```

### 4.2 Socket.io Setup

```typescript
export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',  // Allow all origins (configure for production)
            methods: ['GET', 'POST']
        }
    });

    // Authentication middleware (runs on every connection)
    io.use((socket: Socket, next) => {
        const token = socket.handshake.query.token as string;
        
        if (!token) {
            return next(new Error('Authentication error'));
        }
        
        try {
            const decoded = jwt.verify(token, config.auth.jwtSecret) as { id: string };
            socket.data.userId = decoded.id;  // Attach user ID to socket
            next();  // Allow connection
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.data.userId}`);
        
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.data.userId}`);
        });
    });
};
```

### 4.3 Client Connection Example

**Frontend:**
```javascript
import io from 'socket.io-client';

const token = localStorage.getItem('jwt_token');

const socket = io('http://localhost:3000', {
    query: { token }  // Pass JWT in query
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('orderUpdate', (data) => {
    console.log('Order updated:', data);
    // Update UI: "Your order is now processing!"
});
```

### 4.4 Emitting Events to Users

```typescript
export const emitToUser = (userId: string, event: string, data: any) => {
    if (!io) return;

    // Find all sockets for this user
    const sockets = Array.from(io.sockets.sockets.values());
    
    sockets.forEach((socket) => {
        if (socket.data.userId === userId) {
            socket.emit(event, data);  // Send event
        }
    });
};
```

**Why forEach?**
- User might have multiple tabs open
- Or multiple devices
- We want to notify ALL of them

### 4.5 Complete Real-Time Update Flow

```
Admin Updates Order Status:
PATCH /api/orders/order_123/status
Body: { "orderStatus": "shipped" }
    ↓
Order Controller:
    ↓
1. Update database
   order.orderStatus = "shipped"
    ↓
2. Get user ID from order
   userId = "user_123"
    ↓
3. Emit Socket.io event
   emitToUser("user_123", "orderUpdate", {
       orderId: "order_123",
       orderStatus: "shipped",
       paymentStatus: "paid"
   })
    ↓
Socket.io Server:
    ↓
4. Find all connected sockets for user_123
   socket1 (browser tab 1)
   socket2 (browser tab 2)
   socket3 (mobile app)
    ↓
5. Emit to all 3 sockets
    ↓
Client(s):
    ↓
6. Receive event instantly
   socket.on('orderUpdate', (data) => {
       showNotification("Your order has shipped! 🚚");
   })
```

---

## 5. Complete Flow Diagrams

### 5.1 Full Order Creation Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser/Mobile)                         │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            │ 1. POST /api/orders
                            │    Authorization: Bearer <JWT>
                            │    { items, paymentMethod: "stripe" }
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                         MIDDLEWARE CHAIN                            │
├────────────────────────────────────────────────────────────────────┤
│ generalLimiter → Check: 100 req/15min limit                        │
│       ↓                                                             │
│ authenticate → Verify JWT, attach req.user                         │
│       ↓                                                             │
│ requirePermission(ORDERS_CREATE) → Check user has permission       │
└───────────────────────────┬────────────────────────────────────────┘
                            │ All checks passed
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                      ORDER CONTROLLER                               │
├────────────────────────────────────────────────────────────────────┤
│ 1. Extract: items, paymentMethod                                   │
│ 2. Get userId from req.user.id                                     │
│ 3. Call: orderService.createOrder(userId, data)                    │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                       ORDER SERVICE                                 │
├────────────────────────────────────────────────────────────────────┤
│ 1. Calculate: totalAmount = sum(item.price * item.quantity)        │
│ 2. prisma.order.create({                                           │
│      userId, totalAmount, paymentMethod,                           │
│      paymentStatus: "pending",                                     │
│      orderStatus: "pending",                                       │
│      items: [...]                                                  │
│    })                                                              │
│ 3. paymentService.initiatePayment(totalAmount, method, order.id)   │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                      PAYMENT SERVICE                                │
├────────────────────────────────────────────────────────────────────┤
│ if (stripe):                                                        │
│   paymentIntent = stripe.paymentIntents.create({                   │
│     amount: totalAmount * 100,                                     │
│     currency: "usd",                                               │
│     metadata: { orderId }  ← CRITICAL LINK                         │
│   })                                                               │
│   return { clientSecret, paymentId }                               │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            │ Response
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                        BACK TO CLIENT                               │
├────────────────────────────────────────────────────────────────────┤
│ {                                                                   │
│   order: { id, totalAmount, status: "pending" },                   │
│   payment: { clientSecret, paymentId }                             │
│ }                                                                   │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            │ 2. Client calls Stripe.js
                            │    stripe.confirmCardPayment(clientSecret)
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                         STRIPE SERVERS                              │
├────────────────────────────────────────────────────────────────────┤
│ • Process card payment                                              │
│ • Charge customer                                                   │
│ • Send webhook: POST /payments/stripe/webhook                      │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                      STRIPE WEBHOOK HANDLER                         │
├────────────────────────────────────────────────────────────────────┤
│ 1. Verify signature (security!)                                    │
│ 2. Extract orderId from metadata                                   │
│ 3. prisma.order.update({                                           │
│      paymentStatus: "paid",                                        │
│      orderStatus: "processing"                                     │
│    })                                                              │
│ 4. emitToUser(userId, "orderUpdate", {...})                        │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                      SOCKET.IO SERVER                               │
├────────────────────────────────────────────────────────────────────┤
│ • Find all sockets for userId                                       │
│ • Emit "orderUpdate" event to all                                  │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│                    CLIENT RECEIVES EVENT                            │
├────────────────────────────────────────────────────────────────────┤
│ socket.on('orderUpdate', (data) => {                               │
│   showNotification("Payment successful! Order processing...");     │
│   updateUI(data);                                                  │
│ });                                                                 │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 Admin Updates Order Status Flow

```
Admin Action: PATCH /orders/:id/status { orderStatus: "shipped" }
    ↓
authenticate middleware
    ↓
requirePermission(ORDERS_UPDATE)
    ↓
Order Controller:
    ├─> 1. orderService.updateOrderStatus(id, status)
    │       ↓
    │   prisma.order.update({ orderStatus: "shipped" })
    │       ↓
    │   Returns updated order
    │
    ├─> 2. emitToUser(order.userId, "orderUpdate", {...})
    │       ↓
    │   Socket.io finds user's sockets
    │       ↓
    │   Emits to all user's devices
    │
    └─> 3. Respond to admin: { order: {...} }

Meanwhile, Customer's Browser:
    socket.on("orderUpdate", (data) => {
        if (data.orderStatus === "shipped") {
            showBanner("📦 Your order has shipped!");
        }
    });
```

### 5.3 AI Chat with Context Flow

```
Request: POST /api/chatbot { message: "Tell me about laptops" }
    ↓
authenticate middleware
    ↓
chatbotLimiter (max 10 req/min)
    ↓
Chat Controller
    ↓
Chat Service:
    │
    ├─> 1. getChatHistory(userId)
    │       ↓
    │   Redis: GET chat:history:user_123
    │       ↓
    │   Returns: [
    │     { user: "What products?", assistant: "We have..." },
    │     ...previous messages
    │   ]
    │
    ├─> 2. Build context messages:
    │   [
    │     { system: "You are helpful assistant..." },
    │     { user: "What products?" },
    │     { assistant: "We have electronics..." },
    │     { user: "Tell me about laptops" }  ← NEW
    │   ]
    │
    ├─> 3. Call OpenRouter API
    │       ↓
    │   POST https://openrouter.ai/api/v1/chat/completions
    │   {
    │     model: "x-ai/grok-4.1-fast:free",
    │     messages: [...]
    │   }
    │       ↓
    │   AI processes WITH full context
    │       ↓
    │   Returns: "We have Dell XPS 13, MacBook Pro..."
    │
    ├─> 4. Update history:
    │   history.push({ user: "Tell me about laptops" })
    │   history.push({ assistant: "We have Dell XPS..." })
    │   if (history.length > 6) { trim to last 6 }
    │
    ├─> 5. Save to Redis with 24h TTL:
    │   redis.setEx("chat:history:user_123", 86400, JSON.stringify(history))
    │
    └─> 6. Return to user: { reply: "We have Dell XPS..." }
```

---

## Summary

### Key Takeaways

1. **Middlewares = Security Layers**
   - Each request passes through multiple checks
   - Authentication → Authorization → Rate Limiting

2. **Chat System = Context + AI**
   - Redis stores conversation history
   - AI gets full context for intelligent responses
   - Auto-expires after 24 hours

3. **Payment System = Async + Webhooks**
   - Client initiates → Stripe processes → Webhook confirms
   - Never trust client-side payment status
   - Always verify via webhooks

4. **Socket.io = Real-Time Bridge**
   - JWT authentication on connection
   - Push events from server → client
   - Multiple devices supported

### Architecture Principles

✅ **Separation of Concerns:** Controller → Service → Database  
✅ **Security First:** JWT, RBAC, Rate Limiting  
✅ **Resilience:** Redis fallback to memory  
✅ **Real-Time:** Socket.io for instant updates  
✅ **Scalability:** Redis-backed rate limiting, distributed ready  

---

**This architecture is production-ready and follows industry best practices!** 🚀
