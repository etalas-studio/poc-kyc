import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    name?: string;
    password?: string;
  } | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "Missing required email and password fields." },
      { status: 400 }
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(body.password, 12);
    
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name ?? null,
        password: hashedPassword,
      },
    });
    
    // Don't return the password in the response
    const { password, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
