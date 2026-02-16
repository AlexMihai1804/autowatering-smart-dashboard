# AWS Migration Checklist

## 1) Backend deploy
```powershell
cd backend\aws-autowatering-backend
npm install
npm run build
sam deploy --guided
```

If `sam` is missing, install AWS SAM CLI first.

## 2) Required deploy parameters
- `CognitoUserPoolId`
- `CognitoAppClientId`
- `CognitoUserPoolArn`
- `KindwiseApiKey`
- `StripeSecretKey`
- `StripeWebhookSecret`
- `StripeMonthlyPriceId`

## 3) Frontend `.env`
Use API base URL from stack output (`ApiBaseUrl`):

```env
VITE_AWS_REGION=eu-central-1
VITE_COGNITO_USER_POOL_ID=eu-central-1_xxxxx
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxx

VITE_AI_DOCTOR_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/aiDoctor
VITE_PLANT_ID_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/plantId

VITE_SUBSCRIPTION_STATUS_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/subscriptionStatus
VITE_SUBSCRIPTION_CHECKOUT_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/createSubscriptionCheckout
VITE_SUBSCRIPTION_BILLING_PORTAL_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/createBillingPortalSession
VITE_PROFILE_GET_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/getProfile
VITE_PROFILE_UPDATE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/updateProfile
VITE_USER_STATE_GET_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/getUserState
VITE_USER_STATE_SAVE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/saveUserState
VITE_ACCOUNT_DELETE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/deleteMyAccount
```

Optional Google sign-in via Cognito Hosted UI:

```env
VITE_COGNITO_HOSTED_UI_DOMAIN=your-domain.auth.<region>.amazoncognito.com
VITE_COGNITO_REDIRECT_URI=https://your-app-domain/auth
VITE_COGNITO_LOGOUT_URI=https://your-app-domain/auth
```

## 4) Stripe webhook
Configure endpoint:
- `https://<api-id>.execute-api.<region>.amazonaws.com/stripeWebhook`

Events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
