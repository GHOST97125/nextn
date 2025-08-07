'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a list of materials needed for repairing road sign defects.
 *
 * - generateRepairMaterialsList - A function that takes a list of defects and returns a list of materials needed for the repairs.
 * - GenerateRepairMaterialsListInput - The input type for the generateRepairMaterialsList function.
 * - GenerateRepairMaterialsListOutput - The return type for the generateRepairMaterialsList function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRepairMaterialsListInputSchema = z.object({
  defects: z.string().describe('A comma separated list of road sign defects.'),
});
export type GenerateRepairMaterialsListInput = z.infer<typeof GenerateRepairMaterialsListInputSchema>;

const GenerateRepairMaterialsListOutputSchema = z.object({
  materials: z.string().describe('A list of materials needed for repairing the identified defects.'),
});
export type GenerateRepairMaterialsListOutput = z.infer<typeof GenerateRepairMaterialsListOutputSchema>;

export async function generateRepairMaterialsList(input: GenerateRepairMaterialsListInput): Promise<GenerateRepairMaterialsListOutput> {
  return generateRepairMaterialsListFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRepairMaterialsListPrompt',
  input: {schema: GenerateRepairMaterialsListInputSchema},
  output: {schema: GenerateRepairMaterialsListOutputSchema},
  prompt: `You are a maintenance worker. Based on the following list of road sign defects, generate a list of materials needed for the repairs:\n\n{{defects}}`,
});

const generateRepairMaterialsListFlow = ai.defineFlow(
  {
    name: 'generateRepairMaterialsListFlow',
    inputSchema: GenerateRepairMaterialsListInputSchema,
    outputSchema: GenerateRepairMaterialsListOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
