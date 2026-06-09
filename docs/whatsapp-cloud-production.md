# Meta WhatsApp Cloud API Production Checklist

## 1. Meta Side

Create or prepare these items in Meta Business Manager:

- A verified Meta Business account
- A WhatsApp Business Account (WABA)
- A phone number connected to WhatsApp Cloud API
- A permanent system user access token with `whatsapp_business_messaging`
- An approved message template for OTP delivery

Recommended template body:

```text
Dogrulama kodunuz: {{1}}
```

Template requirements:

- Category: `AUTHENTICATION` if available in your Meta account flow
- One body parameter only: OTP code
- Language: `tr`

## 2. Backend Environment Variables

Set these values in production:

```env
WHATSAPP_ENABLED=true
WHATSAPP_API_URL=https://graph.facebook.com
WHATSAPP_API_VERSION=v22.0
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_OTP_TEMPLATE_NAME=...
WHATSAPP_OTP_TEMPLATE_LANGUAGE_CODE=tr
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
BASE_URL=https://your-api-domain.com
```

## 3. Webhook Configuration in Meta

Use this callback URL:

```text
https://your-api-domain.com/sms/whatsapp/webhook
```

Use this verify token:

```text
WHATSAPP_WEBHOOK_VERIFY_TOKEN
```

Subscribe at minimum to:

- `messages`
- `message_template_status_update`

## 4. Current Application Behavior

- Registration phone verification OTP is sent via WhatsApp
- Login OTP is sent via WhatsApp
- Resend verification OTP is sent via WhatsApp
- Forgot password OTP is sent via WhatsApp
- In `development`, OTP send is mocked and only logged

## 5. Smoke Test

1. Create a new user via register
2. Confirm backend logs show WhatsApp OTP send
3. Verify phone with the OTP
4. Request login OTP
5. Complete login

## 6. Notes

- If template approval is not complete, production sends will fail at Meta API level
- Current webhook callback acknowledges incoming events and logs payloads
- Delivery status persistence can be added later if WhatsApp tracking needs to be audited in the database
