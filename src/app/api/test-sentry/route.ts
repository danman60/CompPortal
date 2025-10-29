import { NextResponse } from 'next/server';

export async function GET() {
  // This will be caught by Sentry server-side tracking
  throw new Error('🧪 Test: Server-side error from API route');

  // This line never executes but TypeScript needs a return
  return NextResponse.json({ message: 'This should never be reached' });
}
