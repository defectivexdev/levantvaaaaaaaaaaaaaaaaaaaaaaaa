# Levant Virtual Airline - Setup Guide

## 🚀 Quick Start

### 1. Web Application Setup

#### Prerequisites
- Node.js 20+ installed
- MongoDB database (MongoDB Atlas recommended)
- Cloudinary account for image storage
- Pusher account for real-time features

#### Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all required values in `.env.local`:

**Required Variables:**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Random 32+ character string for JWT signing
- `APP_KEY` - HMAC key for ACARS security (must match ACARS client)
- `BASE_URL` - Your production URL (e.g., https://www.levant-va.com)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Same as CLOUDINARY_CLOUD_NAME (for client-side)
- `PUSHER_APP_ID` - Pusher app ID
- `PUSHER_SECRET` - Pusher secret key
- `NEXT_PUBLIC_PUSHER_KEY` - Pusher public key (for client-side)
- `NEXT_PUBLIC_PUSHER_CLUSTER` - Pusher cluster (e.g., us2, eu)

**Optional but Recommended:**
- `SMTP_*` - Email configuration for notifications
- `DISCORD_WEBHOOK_*` - Discord webhooks for various events
- `GITHUB_LIVERIES_REPO` - Repository for aircraft liveries
- `GITHUB_TOKEN` - GitHub personal access token

#### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

### 2. ACARS Client Setup (C# Desktop App)

#### Prerequisites
- .NET 8.0 SDK or Runtime
- Windows 10/11
- FSUIPC installed (for flight simulator integration)

#### Configuration

The ACARS client uses a `config.json` file stored in:
```
%AppData%/LevantACARS/config.json
```

1. Copy the example config:
   ```bash
   cp LevantACARS/config.example.json %AppData%/LevantACARS/config.json
   ```

2. Update the following critical values:
   - `app_key` - **MUST match the APP_KEY in your web .env file**
   - `api_base_url` - Your API endpoint (e.g., https://www.levant-va.com/api/acars)
   - `cloudinary_cloud_name` - Same as web application
   - `discord_webhook_url` - Discord webhook for ACARS notifications

**Important:** The `app_key` in the ACARS config must exactly match the `APP_KEY` environment variable in your web application for PIREP security validation to work.

#### Building ACARS

```bash
cd LevantACARS
dotnet build -c Release
dotnet publish -c Release -r win-x64 --self-contained
```

---

## 🔐 GitHub Actions Secrets

To enable automated deployments, add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET` | JWT signing key (32+ chars) | `your-super-secret-jwt-key-min-32-chars` |
| `APP_KEY` | HMAC signing key for ACARS | `your-hmac-signing-key-for-acars-security` |
| `BASE_URL` | Production URL | `https://www.levant-va.com` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcdefghijklmnopqrstuvwxyz` |
| `PUSHER_APP_ID` | Pusher app ID | `1234567` |
| `PUSHER_SECRET` | Pusher secret key | `abc123def456` |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher public key | `xyz789abc123` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster | `us2` |

### Optional Secrets

| Secret Name | Description |
|------------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (usually 465 or 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Email sender address |
| `DISCORD_WEBHOOK_TAKEOFF` | Discord webhook for takeoff notifications |
| `DISCORD_WEBHOOK_LANDING` | Discord webhook for landing notifications |
| `DISCORD_WEBHOOK_RANK_PROMOTE` | Discord webhook for rank promotions |
| `DISCORD_WEBHOOK_AWARD` | Discord webhook for award notifications |
| `DISCORD_WEBHOOK_ERROR_LOG` | Discord webhook for error logs |
| `DISCORD_MOD_WEBHOOK` | Discord webhook for moderation alerts |
| `DISCORD_FINANCE_WEBHOOK` | Discord webhook for finance updates |
| `GITHUB_LIVERIES_REPO` | GitHub repo for liveries (format: `user/repo`) |
| `GH_LIVERIES_TOKEN` | GitHub personal access token |
| `AUTO_PIREP_REJECT_LANDING_RATE` | Auto-reject threshold (default: `-700`) |

---

## 🔧 How to Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name (exactly as shown above)
5. Paste the secret value
6. Click **Add secret**
7. Repeat for all required secrets

---

## 📝 Generating Secure Keys

### JWT_SECRET and APP_KEY

Generate secure random strings using:

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Online:** Use https://generate-secret.vercel.app/32

---

## 🚨 Security Checklist

- [ ] Never commit `.env.local` or `.env` files to git
- [ ] Ensure `APP_KEY` matches between web and ACARS
- [ ] Use strong, unique passwords for all services
- [ ] Rotate secrets regularly (every 90 days recommended)
- [ ] Enable 2FA on all third-party services
- [ ] Use environment-specific secrets (dev/staging/prod)
- [ ] Restrict GitHub Actions secrets to specific workflows
- [ ] Monitor Discord webhooks for unauthorized access
- [ ] Keep dependencies updated (`npm audit fix`)

---

## 🐛 Troubleshooting

### ACARS "Security Violation" Error
- **Cause:** `APP_KEY` mismatch between web and ACARS
- **Fix:** Ensure both use the exact same value

### Flight Data Not Saving
- **Cause:** Missing `APP_KEY` or signature validation failing
- **Fix:** Check ACARS logs and verify `APP_KEY` is set correctly

### Real-time Tracking Not Working
- **Cause:** Pusher credentials incorrect or missing
- **Fix:** Verify all `PUSHER_*` and `NEXT_PUBLIC_PUSHER_*` variables

### Email Notifications Not Sending
- **Cause:** SMTP configuration incorrect
- **Fix:** Test SMTP credentials, check firewall/port blocking

---

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [MongoDB Atlas Setup](https://www.mongodb.com/cloud/atlas)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Pusher Documentation](https://pusher.com/docs)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## 💬 Support

For issues or questions:
- Check existing GitHub Issues
- Create a new issue with detailed logs
- Contact the development team

**Happy Flying! ✈️**
