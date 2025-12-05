# Lemon Squeezy Payment & Subscription Flow

## Overview
Subscriptions are now activated via webhooks with a two-step confirmation:
1. **subscription_created**: User completes checkout → subscription set to `pending`
2. **subscription_payment_success**: Payment confirmed → subscription set to `active`

## Webhook Configuration

### Required Events
In Lemon Squeezy Dashboard → Settings → Webhooks:
- ✅ `subscription_created`
- ✅ `subscription_payment_success`
- ✅ `subscription_updated`
- ✅ `subscription_cancelled`

### Webhook URL
```
https://thinksoft.dev/api/webhooks/lemon-squeezy
```

### Webhook Secret
Ensure `LEMON_SQUEEZY_WEBHOOK_SECRET` env var matches your Lemon Squeezy webhook signing secret.

## Data Flow

### User Checkout
1. User clicks "Get started" on pricing page
2. Redirected to Lemon Squeezy with `checkout[custom][user_id]={clerkUserId}`
3. User completes payment on Lemon Squeezy

### Webhook Events (Automatic)
```
subscription_created
↓
status = 'pending'
↓
subscription_payment_success
↓
status = 'active'
```

### Frontend Sync
- Pricing page fetches `/api/user/subscription` to show "Current Plan" badge
- Status is `active` when subscription is fully activated
- No manual activation needed

## Status Values
- `pending`: Subscription created, awaiting payment confirmation
- `active`: Payment confirmed, full access granted
- `trialing`: Trial period active
- `past_due`: Payment failed, subscription at risk
- `cancelled`: Subscription cancelled

## Database Schema

Table: `subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| user_id | VARCHAR(255) UNIQUE | Clerk user ID |
| plan_id | VARCHAR(50) | 'free', 'pro', 'business', 'enterprise' |
| status | subscription_status (enum) | active, pending, trialing, past_due, cancelled |
| lemon_squeezy_subscription_id | VARCHAR(255) UNIQUE | Lemon Squeezy subscription ID |
| lemon_squeezy_order_id | VARCHAR(255) | Lemon Squeezy order ID |
| current_period_start | TIMESTAMP | Period start date |
| current_period_end | TIMESTAMP | Period end date |
| created_at | TIMESTAMP | When subscription was created |
| updated_at | TIMESTAMP | When subscription was last updated |

## API Endpoints

### GET /api/user/subscription
Fetch current user's subscription status.
**Response**: `{ subscription: Subscription | null }`

### POST /api/webhooks/lemon-squeezy
Webhook handler. Called by Lemon Squeezy.
**Headers**: `x-signature` (HMAC-SHA256 signature)
**Body**: Lemon Squeezy webhook payload

## Testing Checklist

- [ ] Webhook endpoint accessible at `/api/webhooks/lemon-squeezy`
- [ ] `LEMON_SQUEEZY_WEBHOOK_SECRET` set correctly
- [ ] Lemon Squeezy dashboard configured with webhook URL and events
- [ ] Test payment in Lemon Squeezy sandbox mode
- [ ] Verify `subscription_created` event creates subscription with `status = 'pending'`
- [ ] Verify `subscription_payment_success` event updates to `status = 'active'`
- [ ] Pricing page shows "Current Plan" badge only when `status = 'active'`
- [ ] User can access premium features immediately after payment succeeds
- [ ] Webhook signature verification passes
- [ ] Database records correctly updated with plan_id, period dates

## Troubleshooting

### Subscription not activating
1. Check webhook logs in Lemon Squeezy dashboard
2. Verify webhook secret matches `LEMON_SQUEEZY_WEBHOOK_SECRET`
3. Ensure `checkout[custom][user_id]` is included in checkout URL
4. Check database for `subscriptions` record (should have both events)

### Signature verification fails
- Verify webhook secret is correct
- Ensure signature header is `x-signature` (not `x-lemon-squeezy-signature`)

### User not in custom field
- Verify Lemon Squeezy checkout URL includes `checkout[custom][user_id]`
- Check pricing page's `handleGetStarted` function appends user ID
