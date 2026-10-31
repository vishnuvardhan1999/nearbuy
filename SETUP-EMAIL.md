# Order emails (Resend + Supabase Edge Function)

Emails are sent from **orders@shopnip.co.uk** with Reply-To **hello@shopnip.co.uk** by `supabase/functions/order-email`.

- **Placed:** a confirmation goes to the customer and a new-order alert goes to the shop owner.
- **Status changes** (accepted, ready, out for delivery, delivered/collected, cancelled, declined) email the customer.

The site calls the function in the background after `place_order` / `update_order_status`. If it fails, checkout and the dashboard carry on as normal. Until the steps below are done, the call fails quietly and no email is sent.

## 1. Create a Resend account and verify the domain
1. Sign up at https://resend.com and go to **Domains → Add domain**. Enter `shopnip.co.uk` and choose region **eu-west-1 (Ireland)**.
2. Add the DNS records Resend shows at your DNS provider. Copy the exact values from the Resend dashboard, because they are unique to your account:
   | Type | Name (host) | Value |
   |---|---|---|
   | TXT | `resend._domainkey` | DKIM public key (`p=MIGf…`) |
   | MX | `send` | `feedback-smtp.eu-west-1.amazonses.com`, priority 10 |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
   | TXT (recommended) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@shopnip.co.uk` |
3. Click **Verify** and wait until the domain shows **Verified**. This usually takes minutes but can take up to a few hours.
4. **API Keys → Create API key** with *Sending access* for `shopnip.co.uk`. Copy the key, which starts with `re_`.
5. Make sure **hello@shopnip.co.uk** is a real mailbox or forward, because customer replies go there.

## 2. Database tables
Run `migrations/012_order_email_log.sql` in the Supabase SQL editor. It stops the same email being sent twice.

## 3. Deploy the function
```bash
npm i -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref nvkfatgnlydgznzczehj
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
# optional overrides
# supabase secrets set EMAIL_FROM="ShopNip <orders@shopnip.co.uk>" EMAIL_REPLY_TO=hello@shopnip.co.uk SITE_URL=https://www.shopnip.co.uk
supabase functions deploy order-email
```
Keep JWT verification on (the default). The function checks that the signed-in caller is the order's customer or the shop owner, and that the event matches the order's current status.

## 4. Test
Place a test order on the live site and check the Resend dashboard (**Emails**) and `supabase functions logs order-email`.

Never commit the API key. It lives only in Supabase secrets.
