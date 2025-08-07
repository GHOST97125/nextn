'use server';

/**
 * @fileOverview A road sign image analysis AI agent.
 *
 * - analyzeSignImage - A function that handles the road sign image analysis process.
 * - AnalyzeSignImageInput - The input type for the analyzeSignImage function.
 * - AnalyzeSignImageOutput - The return type for the analyzeSignImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSignImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a road sign, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  panelId: z.string().describe('The ID of the road sign.'),
});
export type AnalyzeSignImageInput = z.infer<typeof AnalyzeSignImageInputSchema>;

const AnalyzeSignImageOutputSchema = z.object({
  analysis: z.string().describe('The analysis of the road sign image.'),
});
export type AnalyzeSignImageOutput = z.infer<typeof AnalyzeSignImageOutputSchema>;

export async function analyzeSignImage(input: AnalyzeSignImageInput): Promise<AnalyzeSignImageOutput> {
  return analyzeSignImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSignImagePrompt',
  input: {schema: AnalyzeSignImageInputSchema},
  output: {schema: AnalyzeSignImageOutputSchema},
  prompt: `You are an expert road inspector specializing in identifying defects in road signs.

You will use this information to analyze the road sign and identify any issues it has.

Sign ID: {{{panelId}}}
Photo: {{media url=photoDataUri}}

Describe its defects in a very concise manner in a single sentence. If the sign is in good condition, simply say so.`,
});

const analyzeSignImageFlow = ai.defineFlow(
  {
    name: 'analyzeSignImageFlow',
    inputSchema: AnalyzeSignImageInputSchema,
    outputSchema: AnalyzeSignImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
