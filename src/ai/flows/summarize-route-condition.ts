'use server';

/**
 * @fileOverview Summarizes the condition of a route based on identified defects in road signs.
 *
 * - summarizeRouteCondition - A function that summarizes the route condition.
 * - SummarizeRouteConditionInput - The input type for the summarizeRouteCondition function.
 * - SummarizeRouteConditionOutput - The return type for the summarizeRouteCondition function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeRouteConditionInputSchema = z.object({
  observations: z
    .string()
    .describe(
      'A string containing observations about the condition of road signs along a route.'
    ),
});
export type SummarizeRouteConditionInput = z.infer<
  typeof SummarizeRouteConditionInputSchema
>;

const SummarizeRouteConditionOutputSchema = z.object({
  summary: z.string().describe('A summary of the condition of the route.'),
  recommendation: z
    .string()
    .describe('A general recommendation for the route.'),
  priorities: z
    .array(z.string())
    .describe('A list of the three most urgent actions to take.'),
});
export type SummarizeRouteConditionOutput = z.infer<
  typeof SummarizeRouteConditionOutputSchema
>;

export async function summarizeRouteCondition(
  input: SummarizeRouteConditionInput
): Promise<SummarizeRouteConditionOutput> {
  return summarizeRouteConditionFlow(input);
}

const summarizeRouteConditionPrompt = ai.definePrompt({
  name: 'summarizeRouteConditionPrompt',
  input: {schema: SummarizeRouteConditionInputSchema},
  output: {schema: SummarizeRouteConditionOutputSchema},
  prompt: `En tant que responsable de maintenance routière, synthétise les observations suivantes qui concernent plusieurs panneaux sur un même itinéraire en Guadeloupe:
            "{{observations}}"
            Génère une réponse au format JSON. Le JSON doit contenir les clés suivantes :
            - "summary": une phrase résumant l'état général de la signalisation sur la route.
            - "recommendation": une recommandation globale pour la tournée (ex: "Prévoir une campagne de nettoyage", "Remplacement de plusieurs panneaux à budgétiser").
            - "priorities": un tableau des 3 actions les plus urgentes à mener, en utilisant l'identifiant du panneau (ex: D023-060_01) si fourni.`,
});

const summarizeRouteConditionFlow = ai.defineFlow(
  {
    name: 'summarizeRouteConditionFlow',
    inputSchema: SummarizeRouteConditionInputSchema,
    outputSchema: SummarizeRouteConditionOutputSchema,
  },
  async input => {
    const {output} = await summarizeRouteConditionPrompt(input);
    return output!;
  }
);
