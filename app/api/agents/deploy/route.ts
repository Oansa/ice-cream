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

/**
 * Validate strategy graph JSON structure
 * Checks that all nodes and edges are properly formed
 */
function validateStrategyGraphStructure(graphJson: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const graph = JSON.parse(graphJson);

    // Check basic structure
    if (!Array.isArray(graph.nodes)) {
      errors.push('Strategy graph must have a "nodes" array');
      return { valid: false, errors };
    }

    if (!Array.isArray(graph.edges)) {
      errors.push('Strategy graph must have an "edges" array');
      return { valid: false, errors };
    }

    // Validate nodes
    const nodeIds = new Set<string>();
    for (let i = 0; i < graph.nodes.length; i++) {
      const node = graph.nodes[i];

      if (!node.id) {
        errors.push(`Node ${i} missing required field: id`);
        continue;
      }

      if (!node.defId) {
        errors.push(`Node "${node.id}" missing required field: defId`);
        continue;
      }

      nodeIds.add(node.id);
    }

    // Validate edges reference existing nodes
    for (let i = 0; i < graph.edges.length; i++) {
      const edge = graph.edges[i];

      if (!edge.source) {
        errors.push(`Edge ${i} missing required field: source`);
        continue;
      }

      if (!edge.target) {
        errors.push(`Edge ${i} missing required field: target`);
        continue;
      }

      if (!edge.sourceHandle) {
        errors.push(`Edge ${i} missing required field: sourceHandle`);
        continue;
      }

      if (!edge.targetHandle) {
        errors.push(`Edge ${i} missing required field: targetHandle`);
        continue;
      }

      // Check nodes exist
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${i} references non-existent source node: ${edge.source}`);
      }

      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${i} references non-existent target node: ${edge.target}`);
      }
    }

    return { valid: errors.length === 0, errors };
  } catch (parseError) {
    errors.push(`Invalid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    return { valid: false, errors };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = DeployAgentSchema.parse(body);

    // If strategy graph is provided, validate it
    if (validatedData.strategy_graph) {
      const graphValidation = validateStrategyGraphStructure(validatedData.strategy_graph);

      if (!graphValidation.valid) {
        return NextResponse.json(
          {
            error: 'Invalid strategy graph',
            details: graphValidation.errors,
          },
          { status: 400 }
        );
      }
    }

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
    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Server not configured - missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

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
