/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

/**
 * QVAC Service - Phase 5 AI Assistant
 * Provides structured offline intents from natural language, using QVAC SDK if available,
 * or gracefully falling back to a heuristic parser.
 */

let qvacSDK: any = null;
let activeModel: string | null = null;
export let aiEngineUsed: 'QVAC' | 'None' = 'None';

export interface PaymentIntent {
  action: 'pay' | 'buy_ticket' | 'donate' | 'show_spending' | 'unknown';
  merchant?: string;
  amount?: number;
  currency?: string;
  confidence?: number;
}

// 1. Initialize QVAC SDK
async function initQvac(): Promise<boolean> {
  if (qvacSDK) return true;
  try {
    // Attempt dynamic import of local QVAC SDK
    const mod = await import(/* webpackIgnore: true */ '@qvac/sdk');
    qvacSDK = mod;
    aiEngineUsed = 'QVAC';
    return true;
  } catch {
    console.warn('[QVAC] SDK not available in this environment.');
    aiEngineUsed = 'None';
    return false;
  }
}

async function getOrLoadModel(): Promise<string | null> {
  const available = await initQvac();
  if (!available || !qvacSDK) return null;
  if (activeModel) return activeModel;

  try {
    const modelId = await qvacSDK.loadModel({
      modelSrc: qvacSDK.LLAMA_3_2_1B_INST_Q4_0,
    });
    activeModel = modelId;
    return modelId;
  } catch (err) {
    console.error('[QVAC] Failed to load local model weights', err);
    aiEngineUsed = 'None';
    return null;
  }
}

export async function parsePaymentCommand(command: string): Promise<{ intent: PaymentIntent, engine: string, error?: string }> {
  try {
    const modelId = await getOrLoadModel();
    if (!modelId || !qvacSDK) {
      return {
        intent: { action: 'unknown', confidence: 0 },
        engine: 'None',
        error: 'AI_UNAVAILABLE'
      };
    }

    const prompt = `You are a strict JSON API. Extract the user's intent from this command: "${command}". 
Supported actions: pay, buy_ticket, donate, show_spending. 
Return ONLY valid JSON in this exact structure and nothing else:
{"action":"pay","merchant":"Store","amount":10,"currency":"USDT","confidence":1}
If you cannot determine the intent, return action "unknown".`;

    const result = await qvacSDK.completion({
      modelId,
      history: [{ role: 'user', content: prompt }],
      stream: true
    });

    let responseText = '';
    for await (const token of result.tokenStream) {
      responseText += token;
    }

    console.log('[QVAC] Raw Model Output:', responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Model output did not contain valid JSON.');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.action) {
      throw new Error('Parsed JSON is missing action field.');
    }

    return { intent: parsed as PaymentIntent, engine: 'QVAC' };

  } catch (err: any) {
    console.error('[QVAC] Inference/Parsing Error:', err.message || err);
    return {
      intent: { action: 'unknown', confidence: 0 },
      engine: aiEngineUsed,
      error: err.message || 'PARSE_ERROR'
    };
  }
}
