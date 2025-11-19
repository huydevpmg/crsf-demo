# CSRF Attack & Defense Demo

This project demonstrates a Cross-Site Request Forgery (CSRF) attack and various mitigation strategies using Node.js.

## Prerequisites
- Node.js installed.
- Dependencies installed (`npm install`).

## Running the Demo

1. **Start the Servers**:
   The servers are already running if you used the assistant. If not, run:
   ```bash
   node bank-server/server.js
   node attacker-server/server.js
   ```

2. **Open the Bank (Victim)**:
   - Go to [http://localhost:3000](http://localhost:3000).
   - Login with:
     - Username: `user`
     - Password: `password`
   - You will see your Dashboard with a balance of **$1000**.

3. **Perform the Attack**:
   - Open a new tab and go to [http://localhost:4000](http://localhost:4000) (The Attacker).
   - Click the **"CLAIM PRIZE NOW"** button.
   - Go back to the Bank tab and refresh (or wait for the balance to update).
   - You should see your balance has decreased (e.g., to $900), and the attacker received the money.

## Mitigation Strategies

You can toggle the security mode in the Bank Dashboard.

### 1. CSRF Token
- **Select "2. CSRF Token"** in the dropdown.
- The server now expects a unique token with every state-changing request.
- The Bank app sends this token automatically.
- **Try the attack again**: The attacker's form does not have this token, so the request will fail (Check the server console or network tab for 403 Forbidden).

### 2. SameSite Cookie
- **Select "3. SameSite Cookie"** in the dropdown.
- **Logout and Login again** to set the new cookie attributes.
- The cookie is now set with `SameSite=Strict` (or Lax).
- **Try the attack again**: The browser will NOT send the cookie with the cross-site request from the attacker's page. The request is unauthorized.

### 3. Origin / Referer Check
- **Select "4. Origin / Referer Check"** in the dropdown.
- The server verifies the `Origin` and `Referer` headers.
- **Try the attack again**: The attacker's origin (`http://localhost:4000`) does not match the bank's origin (`http://localhost:3000`). The request is blocked.

### 4. JWT (Stateless)
- **Select "5. JWT"** in the dropdown.
- **Logout and Login again**.
- Authentication is now handled via a JSON Web Token stored in `localStorage` and sent in the `Authorization` header.
- **Try the attack again**: Forms cannot send custom headers like `Authorization`. The request will fail as "Unauthorized" because no token is sent.

## Notes
- **Browser Behavior**: Some modern browsers default cookies to `SameSite=Lax`. To fully see the "Vulnerable" state, we rely on the fact that `Lax` allows some top-level navigations or we assume an older browser context. However, for `POST` requests, `Lax` usually blocks them cross-site, so the attack might fail by default in Chrome unless the cookie was set with `SameSite=None; Secure` (which requires HTTPS).
- **Demo Adjustment**: In this demo, the "Vulnerable" mode sets `SameSite` explicitly to allow the attack if possible, or relies on the user understanding that without `SameSite`, it is vulnerable.
