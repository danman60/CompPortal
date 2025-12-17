import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantData } from '@/lib/tenant-context';

export async function POST(request: Request) {
  try {
    const tenant = await getTenantData();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const body = await request.json();
    const { firstName, lastName, birthDate } = body;

    // Validate inputs
    if (!firstName || !lastName || !birthDate) {
      return NextResponse.json(
        { error: 'First name, last name, and birth date are required' },
        { status: 400 }
      );
    }

    // Parse the birth date
    const parsedBirthDate = new Date(birthDate);
    if (isNaN(parsedBirthDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid birth date format' },
        { status: 400 }
      );
    }

    // Find dancers matching name + birthdate for this tenant
    const dancers = await prisma.dancers.findMany({
      where: {
        tenant_id: tenant.id,
        first_name: {
          equals: firstName,
          mode: 'insensitive',
        },
        last_name: {
          equals: lastName,
          mode: 'insensitive',
        },
        date_of_birth: parsedBirthDate,
        status: 'active',
      },
      include: {
        studios: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (dancers.length === 0) {
      return NextResponse.json(
        { error: 'No dancer found matching that information' },
        { status: 404 }
      );
    }

    // Map to response format
    const dancerMatches = dancers.map((dancer) => ({
      id: dancer.id,
      first_name: dancer.first_name,
      last_name: dancer.last_name,
      date_of_birth: dancer.date_of_birth?.toISOString().split('T')[0],
      studio_id: dancer.studio_id,
      studio_name: dancer.studios?.name || 'Unknown Studio',
    }));

    return NextResponse.json({ dancers: dancerMatches });
  } catch (error) {
    console.error('Media lookup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during lookup' },
      { status: 500 }
    );
  }
}
