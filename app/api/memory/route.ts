import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Memory API endpoint' });
}

export async function POST() {
  // Placeholder for memory functionality
  return NextResponse.json({ message: 'Memory POST endpoint placeholder' });
}
