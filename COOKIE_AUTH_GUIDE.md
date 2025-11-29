# HTTP-Only Cookie Implementation Guide

## ✅ Implementation Complete!

HTTP-only cookies have been successfully implemented with CSRF protection.

---

## 🔒 Security Improvements

### What Changed:

1. **JWT in HTTP-Only Cookies** (XSS Protection)
   - Token stored in secure cookie
   - JavaScript cannot access token
   - Safe from XSS attacks

2. **CSRF Protection** (CSRF Attack Prevention)
   - CSRF tokens required for state-changing requests
   - Double-submit cookie pattern
   - Automatic token validation

3. **Secure Cookie Settings**
   ```typescript
   {
     httpOnly: true,           // No JavaScript access
     secure: true,            // HTTPS only in production
     sameSite: 'strict',      // Prevent CSRF
     maxAge: 24 * 60 * 60 * 1000  // 24 hours
   }
   ```

---

## 📝 How to Use (Client-Side)

### Step 1: Get CSRF Token

```javascript
// First, get the CSRF token
const csrfResponse = await fetch('http://localhost:3000/api/csrf/csrf-token', {
    credentials: 'include'  // Important: Include cookies
});
const { csrfToken } = await csrfResponse.json();
```

### Step 2: Register/Login (Receives Cookie Automatically)

```javascript
const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken  // Include CSRF token
    },
    credentials: 'include',  // Important: Send/receive cookies
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'SecurePass123!'
    })
});

// Server automatically sets HTTP-only cookie
// Client receives: { user: {...} }
// Cookie stored automatically by browser
```

### Step 3: Make Authenticated Requests

```javascript
// No need to manually send token!
const ordersResponse = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken  // Include CSRF token
    },
    credentials: 'include',  // Browser sends cookie automatically
    body: JSON.stringify({
        items: [...],
        paymentMethod: 'stripe'
    })
});
```

### Step 4: Logout

```javascript
await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
        'X-CSRF-Token': csrfToken
    },
    credentials: 'include'
});
// Cookie cleared automatically
```

---

## 🧪 Testing with Postman

### Setup:

1. **Enable Cookie Jar:**
   - Settings → General → Enable "Automatically follow redirects"
   - Settings → General → Enable "Capture cookies"

2. **Get CSRF Token:**
   ```http
   GET http://localhost:3000/api/csrf/csrf-token
   ```
   Save the `csrfToken` from response.

3. **Register/Login:**
   ```http
   POST http://localhost:3000/api/auth/register
   Content-Type: application/json
   X-CSRF-Token: {{csrfToken}}

   {
     "email": "test@example.com",
     "password": "SecurePass123!"
   }
   ```
   Postman will automatically store the cookie.

4. **Make Requests:**
   ```http
   POST http://localhost:3000/api/orders
   Content-Type: application/json
   X-CSRF-Token: {{csrfToken}}

   {
     "items": [...],
     "paymentMethod": "stripe"
   }
   ```
   Cookie sent automatically by Postman.

---

## 🔌 Socket.io with Cookies

### Client Connection:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
    withCredentials: true  // Important: Send cookies
});

socket.on('connect', () => {
    console.log('Connected with cookie authentication');
});

socket.on('orderUpdate', (data) => {
    console.log('Order updated:', data);
});
```

**Note:** Browser automatically sends cookie in WebSocket handshake.

---

## 🆚 Comparison: Before vs After

### Before (Authorization Header):

```javascript
// Client must manually manage token
localStorage.setItem('token', jwtToken);

fetch('/api/orders', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
});

// ❌ Vulnerable to XSS
<script>
    const token = localStorage.getItem('token');
    // Token can be stolen!
</script>
```

### After (HTTP-Only Cookie):

```javascript
// Client does nothing - browser handles automatically
fetch('/api/orders', {
    credentials: 'include',
    headers: {
        'X-CSRF-Token': csrfToken
    }
});

// ✅ Safe from XSS
<script>
    const token = document.cookie;  // Cannot access httpOnly cookie!
</script>
```

---

## 🔑 Key Differences

| Feature | Old (Header) | New (Cookie) |
|---------|--------------|--------------|
| **Storage** | localStorage | HTTP-only cookie |
| **XSS Protection** | ❌ Vulnerable | ✅ Protected |
| **CSRF Protection** | ✅ Built-in | ✅ Via CSRF token |
| **Manual Token Handling** | Yes | No (automatic) |
| **Mobile Apps** | ✅ Easy | ⚠️ Harder |
| **Third-party APIs** | ✅ Easy | ⚠️ Same-origin better |

---

## 🚨 Important Notes

### 1. **CORS Configuration**

The server is configured to accept cookies from frontend:

```typescript
cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true  // Allow cookies
})
```

**Set in `.env`:**
```env
FRONTEND_URL=http://localhost:3000
```

### 2. **CSRF Token Required**

All POST/PUT/PATCH/DELETE requests need CSRF token:

```javascript
headers: {
    'X-CSRF-Token': csrfToken
}
```

### 3. **Production Settings**

In production (NODE_ENV=production):
- `secure: true` → HTTPS only
- `sameSite: 'strict'` → Extra protection

### 4. **Cookie Domain**

For subdomains (e.g., api.example.com, app.example.com):
```typescript
res.cookie('token', jwt, {
    domain: '.example.com'  // Works for all subdomains
});
```

---

## 📋 Updated Test Cases

### Test 1: Register User

```http
GET http://localhost:3000/api/csrf/csrf-token
# Save csrfToken

POST http://localhost:3000/api/auth/register
Content-Type: application/json
X-CSRF-Token: {{csrfToken}}

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

# ✅ Expected: Cookie set automatically
# Response: { "user": {...} }
```

### Test 2: Create Order

```http
POST http://localhost:3000/api/orders
Content-Type: application/json
X-CSRF-Token: {{csrfToken}}

{
  "items": [{"title": "Laptop", "price": 999, "quantity": 1}],
  "paymentMethod": "stripe"
}

# ✅ Expected: Authenticated via cookie
# No Authorization header needed!
```

### Test 3: Logout

```http
POST http://localhost:3000/api/auth/logout
X-CSRF-Token: {{csrfToken}}

# ✅ Expected: Cookie cleared
# Response: { "message": "Logged out successfully" }
```

### Test 4: Try Request Without CSRF Token

```http
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "items": [...]
}

# ❌ Expected: 403 Forbidden (CSRF validation failed)
```

---

## 🐛 Troubleshooting

### Issue: "Authentication required" even though logged in

**Solution:** Make sure `credentials: 'include'` is set:
```javascript
fetch(url, {
    credentials: 'include'
});
```

### Issue: CSRF token validation fails

**Solution:** 
1. Get fresh CSRF token before each request
2. Include in `X-CSRF-Token` header (case-sensitive)

### Issue: Cookie not set

**Solution:**
1. Check CORS origin matches your frontend URL
2. Verify `credentials: true` in CORS config
3. Use same domain (localhost:3000 for both)

### Issue: Socket.io not connecting

**Solution:**
```javascript
const socket = io(url, {
    withCredentials: true  // Must be true!
});
```

---

## 🎯 Summary

✅ **More Secure:** XSS protection via httpOnly  
✅ **CSRF Protected:** Double-submit cookie pattern  
✅ **Automatic:** Browser handles cookies  
✅ **Production Ready:** Secure, sameSite, domain configured  
✅ **Logout Implemented:** Easy session termination  

**Your authentication is now enterprise-grade!** 🚀

---

## 📚 References

- [OWASP: HttpOnly Cookie](https://owasp.org/www-community/HttpOnly)
- [CSRF Protection Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
