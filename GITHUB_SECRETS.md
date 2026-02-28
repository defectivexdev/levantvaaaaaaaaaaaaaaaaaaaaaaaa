# GitHub Actions Secrets - Quick Reference

## 🔐 How to Add Secrets

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **"New repository secret"**
3. Copy the **Secret Name** exactly as shown below
4. Paste your **Secret Value**
5. Click **"Add secret"**

---

## ✅ Required Secrets (Must Add These)

```
Secret Name: MONGODB_URI
Description: MongoDB connection string
Example: mongodb+srv://username:password@cluster.mongodb.net/levant-va

Secret Name: JWT_SECRET
Description: JWT signing key (generate random 32+ char string)
Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

Secret Name: APP_KEY
Description: HMAC key for ACARS security (MUST match ACARS config!)
Example: your-secure-hmac-key-for-acars-validation

Secret Name: BASE_URL
Description: Your production website URL
Example: https://www.levant-va.com

Secret Name: CLOUDINARY_CLOUD_NAME
Description: Cloudinary cloud name
Example: dh6ytzk50

Secret Name: CLOUDINARY_API_KEY
Description: Cloudinary API key
Example: 123456789012345

Secret Name: CLOUDINARY_API_SECRET
Description: Cloudinary API secret
Example: abcdefghijklmnopqrstuvwxyz123456

Secret Name: PUSHER_APP_ID
Description: Pusher application ID
Example: 1234567

Secret Name: PUSHER_SECRET
Description: Pusher secret key
Example: abc123def456ghi789

Secret Name: NEXT_PUBLIC_PUSHER_KEY
Description: Pusher public key (client-side)
Example: xyz789abc123def456

Secret Name: NEXT_PUBLIC_PUSHER_CLUSTER
Description: Pusher cluster region
Example: us2
```

---

## 📧 Email Secrets (Optional but Recommended)

```
Secret Name: SMTP_HOST
Example: smtp.gmail.com

Secret Name: SMTP_PORT
Example: 465

Secret Name: SMTP_USER
Example: your-email@gmail.com

Secret Name: SMTP_PASS
Example: your-app-specific-password

Secret Name: SMTP_FROM
Example: Levant Virtual Airline <noreply@levant-va.com>
```

---

## 🔔 Discord Webhook Secrets (Optional)

```
Secret Name: DISCORD_WEBHOOK_TAKEOFF
Example: https://discord.com/api/webhooks/123456789/abcdefghijklmnop

Secret Name: DISCORD_WEBHOOK_LANDING
Example: https://discord.com/api/webhooks/123456789/abcdefghijklmnop

Secret Name: DISCORD_WEBHOOK_RANK_PROMOTE
Example: https://discord.com/api/webhooks/123456789/abcdefghijklmnop

Secret Name: DISCORD_WEBHOOK_AWARD
Example: https://discord.com/api/webhooks/123456789/abcdefghijklmnop

Secret Name: DISCORD_WEBHOOK_ERROR_LOG
Example: https://discord.com/api/webhooks/123456789/abcdefghijklmnop

Secret Name: DISCORD_MOD_WEBHOOK
Example: https://discord.com/api/webhooks/123456789/abcdefghijklmnop

Secret Name: DISCORD_FINANCE_WEBHOOK
Example: https://discord.com/api/webhooks/123456789/abcdefghijklmnop
```

---

## 🐙 GitHub Secrets (Optional)

```
Secret Name: GITHUB_LIVERIES_REPO
Description: Repository for aircraft liveries
Example: bunnyyxdev/levant-liveries

Secret Name: GH_LIVERIES_TOKEN
Description: GitHub Personal Access Token
Example: ghp_abcdefghijklmnopqrstuvwxyz1234567890
```

---

## ⚙️ Configuration Secrets (Optional)

```
Secret Name: AUTO_PIREP_REJECT_LANDING_RATE
Description: Auto-reject PIREPs worse than this landing rate
Example: -700
```

---

## �️ ACARS Client Secrets (For deploy-acars.yml)

```
Secret Name: IVAO_CLIENT_ID
Description: IVAO API client ID for weather data
Example: 27821fb3-5158-4c5d-a061-4d4bc99575f2

Secret Name: IVAO_CLIENT_SECRET
Description: IVAO API client secret
Example: 5UO3O05aYIXCilVRpmLSC4k5AxFDwk0X

Secret Name: DISCORD_CLIENT_ID
Description: Discord application ID for Rich Presence
Example: 1464742078792864057

Secret Name: AIRPORTDB_API_TOKEN
Description: AirportDB API token for runway detection
Example: a0a2bf62f585d729830e852c0c2326f9507a3763c8923fc4
```

---

## �🔑 How to Generate Secure Keys

### For JWT_SECRET and APP_KEY:

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Using Online Tool:**
Visit: https://generate-secret.vercel.app/32

---

## ⚠️ Critical Notes

1. **APP_KEY MUST MATCH** between GitHub Secrets and ACARS `config.json`
2. **Never share** these secrets publicly
3. **Never commit** secrets to your repository
4. **Rotate secrets** every 90 days for security
5. All secret names are **case-sensitive**

---

## ✅ Verification Checklist

After adding all secrets, verify:

- [ ] All required secrets added (11 total minimum)
- [ ] Secret names match exactly (case-sensitive)
- [ ] APP_KEY matches between web and ACARS
- [ ] Pusher credentials are correct
- [ ] MongoDB URI includes database name
- [ ] BASE_URL has no trailing slash
- [ ] NEXT_PUBLIC_* secrets added for client-side access

---

## 🚀 After Adding Secrets

1. Push code to `main` branch
2. GitHub Actions will automatically deploy
3. Check Actions tab for deployment status
4. Monitor for any errors in workflow logs

---

**Need Help?** Check the full SETUP.md guide for detailed instructions.
