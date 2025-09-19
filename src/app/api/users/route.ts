import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; name?: string }
    | null;

  if (!body?.email) {
    return NextResponse.json(
      { error: 'Missing required email field.' },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name ?? null,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
