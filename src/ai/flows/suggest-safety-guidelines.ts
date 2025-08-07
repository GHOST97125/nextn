// src/ai/flows/suggest-safety-guidelines.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting safety guidelines for road maintenance.
 *
 * - suggestSafetyGuidelines - A function that suggests safety guidelines based on maintenance tasks.
 * - SuggestSafetyGuidelinesInput - The input type for the suggestSafetyGuidelines function.
 * - SuggestSafetyGuidelinesOutput - The return type for the suggestSafetyGuidelines function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSafetyGuidelinesInputSchema = z.object({
  maintenanceTasks: z
    .string()
    .describe('A description of the maintenance tasks to be performed.'),
});
export type SuggestSafetyGuidelinesInput = z.infer<typeof SuggestSafetyGuidelinesInputSchema>;

const SuggestSafetyGuidelinesOutputSchema = z.object({
  safetyGuidelines: z
    .string()
    .describe('A list of safety guidelines for the maintenance tasks.'),
});
export type SuggestSafetyGuidelinesOutput = z.infer<typeof SuggestSafetyGuidelinesOutputSchema>;

export async function suggestSafetyGuidelines(
  input: SuggestSafetyGuidelinesInput
): Promise<SuggestSafetyGuidelinesOutput> {
  return suggestSafetyGuidelinesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSafetyGuidelinesPrompt',
  input: {schema: SuggestSafetyGuidelinesInputSchema},
  output: {schema: SuggestSafetyGuidelinesOutputSchema},
  prompt: `You are a safety expert providing guidelines for road maintenance crews.

  Based on the following maintenance tasks, provide a list of safety guidelines to ensure the safety of the team.

  Maintenance Tasks: {{{maintenanceTasks}}}
  `,
});

const suggestSafetyGuidelinesFlow = ai.defineFlow(
  {
    name: 'suggestSafetyGuidelinesFlow',
    inputSchema: SuggestSafetyGuidelinesInputSchema,
    outputSchema: SuggestSafetyGuidelinesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
