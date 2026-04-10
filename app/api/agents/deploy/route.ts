/**
 * API endpoint to deploy a new trading agent
 * POST /api/agents/deploy
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabaseServer } from '@/lib/supabase';
import type { AgentConfig } from '@/lib/agent-builder';

// Validation schema for agent config
const DeployAgentSchema = z.object({
  name: z.string().min(3, 'Agent name must be at least 3 characters'),
  strategy_type: z.enum(['SPOT', 'DCA', 'SNIPER', 'MARGIN', 'MEME', 'ARBITRAGE', 'VISUAL']),
  token_pair: z.string().min(1, 'Token pair is required'),
  trigger: z.string().min(1, 'Trigger condition is required'),
  position_size: z.number().min(0.01, 'Position size must be greater than 0'),
  stop_loss_pct: z.number().min(0).max(100, 'Stop loss must be between 0 and 100'),
  strategy_graph: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = DeployAgentSchema.parse(body);

    // Generate unique ID for the agent
    const agentId = uuidv4();

    // Prepare agent record
    const agentRecord = {
      id: agentId,
      name: validatedData.name,
      strategy_type: validatedData.strategy_type,
      token_pair: validatedData.token_pair,
      trigger: validatedData.trigger,
      position_size: validatedData.position_size,
      stop_loss_pct: validatedData.stop_loss_pct,
      is_active: true,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      strategy_graph: validatedData.strategy_graph || null,
    };

    // Insert into Supabase
    const { data, error } = await supabaseServer
      .from('agents')
      .insert([agentRecord])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: `Failed to create agent: ${error.message}` },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Agent deployed successfully and will start paper trading within 60 seconds',
        agent: data,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Validation error
      const messages = (error as z.ZodError).issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json(
        { error: 'Validation error', details: messages },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request' },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy agent' },
      { status: 500 }
    );
  }
}
