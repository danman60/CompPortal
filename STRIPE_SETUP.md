# Stripe Payment Integration Setup

**Status**: Foundation implemented, requires Stripe credentials to complete
**Task**: #20 - Stripe Invoice Payment Integration
**Estimate Remaining**: 2-3 hours to complete

## What's Implemented

### ✅ Database Schema
- Migration: `20250112000001_add_stripe_fields_to_invoices`
- Added fields to `invoices` table:
  - `stripe_payment_intent_id` - Tracks Stripe Payment Intent
  - `stripe_customer_id` - Tracks Stripe Customer
  - `paid_at` - Payment completion timestamp
  - `payment_method` - Payment method used (card, etc.)

### ✅ Dependencies Installed
- `stripe` (^19.1.0) - Server-side Stripe SDK
- `@stripe/stripe-js` (^8.0.0) - Client-side Stripe SDK

## What's Needed

###  1. Stripe Account Setup

1. **Create Stripe Account** (if not exists)
   - Sign up at https://dashboard.stripe.com/register

2. **Get API Keys**
   - Dashboard → Developers → API keys
   - Copy both keys (test mode for development)

3. **Set up Webhook Endpoint**
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.created`
     - `customer.updated`

### 2. Environment Variables

Add to `.env.local`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # From Stripe Dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # From Stripe Dashboard

# Stripe Webhook Secret (from webhook endpoint setup)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Remaining Implementation

#### A. Server-side Stripe Client (`src/lib/stripe.ts`)
```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});
```

#### B. tRPC Endpoints (Add to `src/server/routers/invoice.ts`)

**1. Create Payment Intent**
```typescript
createPaymentIntent: publicProcedure
  .input(z.object({ invoiceId: z.string().uuid() }))
  .mutation(async ({ input, ctx }) => {
    const invoice = await prisma.invoices.findUnique({
      where: { id: input.invoiceId },
      include: { studios: true },
    });

    if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });
    if (invoice.status === 'PAID') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice already paid' });
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = invoice.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: invoice.studios.email || undefined,
        name: invoice.studios.name,
        metadata: {
          studioId: invoice.studio_id,
          tenantId: invoice.tenant_id,
        },
      });
      stripeCustomerId = customer.id;

      // Update invoice with customer ID
      await prisma.invoices.update({
        where: { id: invoice.id },
        data: { stripe_customer_id: stripeCustomerId },
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(invoice.total) * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        invoiceId: invoice.id,
        studioId: invoice.studio_id,
        competitionId: invoice.competition_id,
      },
      automatic_payment_methods: { enabled: true },
    });

    // Update invoice with payment intent ID
    await prisma.invoices.update({
      where: { id: invoice.id },
      data: { stripe_payment_intent_id: paymentIntent.id },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }),
```

**2. Get Payment Status**
```typescript
getPaymentStatus: publicProcedure
  .input(z.object({ invoiceId: z.string().uuid() }))
  .query(async ({ input }) => {
    const invoice = await prisma.invoices.findUnique({
      where: { id: input.invoiceId },
      select: {
        stripe_payment_intent_id: true,
        status: true,
        paid_at: true,
      },
    });

    if (!invoice || !invoice.stripe_payment_intent_id) {
      return { status: 'UNPAID', paymentIntent: null };
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      invoice.stripe_payment_intent_id
    );

    return {
      status: invoice.status,
      paid_at: invoice.paid_at,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    };
  }),
```

#### C. Webhook Handler (`src/app/api/webhooks/stripe/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const invoiceId = paymentIntent.metadata.invoiceId;

      if (invoiceId) {
        await prisma.invoices.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paid_at: new Date(),
            payment_method: paymentIntent.payment_method_types[0] || 'card',
          },
        });

        // TODO: Send payment confirmation email
        console.log(`Invoice ${invoiceId} marked as PAID`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error('Payment failed:', paymentIntent.id);
      // TODO: Notify studio of failed payment
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
```

#### D. Payment UI Component (`src/components/InvoicePayment.tsx`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  invoiceId: string;
  amount: number;
}

function PaymentForm({ invoiceId, amount }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/invoices/${invoiceId}/success`,
      },
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Payment Amount: ${amount.toFixed(2)}
        </h3>
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

export default function InvoicePayment({ invoiceId }: { invoiceId: string }) {
  const [clientSecret, setClientSecret] = useState('');

  const createPaymentIntent = trpc.invoice.createPaymentIntent.useMutation({
    onSuccess: (data) => setClientSecret(data.clientSecret!),
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    createPaymentIntent.mutate({ invoiceId });
  }, [invoiceId]);

  if (!clientSecret) {
    return <div className="text-white">Loading payment form...</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm invoiceId={invoiceId} amount={0} />
    </Elements>
  );
}
```

## Testing

### Test Mode

1. Use Stripe test keys (`sk_test_...` and `pk_test_...`)
2. Test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires 3D Secure: `4000 0025 0000 3155`

3. Use any future expiry date (e.g., 12/34)
4. Use any 3-digit CVC (e.g., 123)

### Webhook Testing

Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Production Deployment

1. **Switch to Live Keys**
   - Update `.env.local` with `sk_live_...` and `pk_live_...`
   - Update webhook endpoint to production URL

2. **Verify Webhook**
   - Test webhook delivery in Stripe Dashboard
   - Monitor webhook logs for errors

3. **Enable Payment Methods**
   - Card payments (enabled by default)
   - Optional: ACH, Apple Pay, Google Pay

## Security Notes

- Never commit API keys to git
- Use environment variables for all secrets
- Webhook secret prevents unauthorized requests
- Stripe handles PCI compliance

## Support

- Stripe Docs: https://stripe.com/docs
- Stripe Dashboard: https://dashboard.stripe.com
- Test your integration: https://stripe.com/docs/testing

---

**Status**: Ready for Stripe account setup and completion by user with credentials
