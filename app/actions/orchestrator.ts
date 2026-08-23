'use server';

import { DrumPayload, DrumStatus } from '../types/pipeline';

export async function executePipelineStep(
  currentDrum: DrumPayload
): Promise<DrumPayload> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const payloadLower = currentDrum.compressedPayload.toLowerCase();
  
  // Logic: "ICE" keyword triggers an immediate correction loop
  if (payloadLower.includes('error') || payloadLower.includes('fail')) {
    return {
      ...currentDrum,
      status: 'ICE_CORRECTION',
    };
  }

  // If passed
  return {
    ...currentDrum,
    status: 'PASS',
  };
}
