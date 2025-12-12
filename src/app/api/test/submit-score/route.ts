import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * TEST ENDPOINT - Submit a score for automated testing
 *
 * This endpoint is designed for Playwright automated tests.
 * It bypasses the normal judge authentication flow and directly
 * submits scores to the database.
 *
 * SECURITY: Only works on tester environment (checked via ALLOWED_TENANTS)
 */

export async function POST(request: NextRequest) {
  try {
    // Security: Only allow on tester environment
    const allowedTenants = process.env.ALLOWED_TENANTS;
    if (!allowedTenants?.includes('tester')) {
      return NextResponse.json(
        { error: 'Test endpoint only available on tester environment' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      competitionId,
      entryId,
      judgeNumber = 1,
      score = 85.00,
    } = body;

    if (!competitionId || !entryId) {
      return NextResponse.json(
        { error: 'Missing competitionId or entryId' },
        { status: 400 }
      );
    }

    const totalScore = parseFloat(score);

    if (isNaN(totalScore) || totalScore < 0 || totalScore > 99.99) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 99.99' },
        { status: 400 }
      );
    }

    // Get competition's tenant_id
    const competition = await prisma.competitions.findUnique({
      where: { id: competitionId },
      select: { tenant_id: true },
    });

    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Find or create test judge
    let judge = await prisma.judges.findFirst({
      where: {
        competition_id: competitionId,
        judge_number: judgeNumber,
      },
    });

    if (!judge) {
      // Create test judge
      judge = await prisma.judges.create({
        data: {
          tenant_id: competition.tenant_id,
          competition_id: competitionId,
          judge_number: judgeNumber,
          name: `Test Judge ${judgeNumber}`,
        },
      });
    }

    // Upsert the score - only use total_score for simplicity
    const existingScore = await prisma.scores.findFirst({
      where: {
        entry_id: entryId,
        judge_id: judge.id,
      },
    });

    let scoreRecord;
    if (existingScore) {
      scoreRecord = await prisma.scores.update({
        where: { id: existingScore.id },
        data: {
          total_score: totalScore,
          scored_at: new Date(),
        },
      });
    } else {
      scoreRecord = await prisma.scores.create({
        data: {
          tenant_id: competition.tenant_id,
          entry_id: entryId,
          judge_id: judge.id,
          total_score: totalScore,
          scored_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      scoreId: scoreRecord.id,
      totalScore,
      judgeId: judge.id,
      judgeNumber,
      message: `Score ${totalScore.toFixed(2)} submitted for Judge ${judgeNumber}`,
    });

  } catch (error) {
    console.error('Test submit-score error:', error);
    return NextResponse.json(
      { error: 'Failed to submit test score', details: String(error) },
      { status: 500 }
    );
  }
}
