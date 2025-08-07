import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-sign-image.ts';
import '@/ai/flows/suggest-safety-guidelines.ts';
import '@/ai/flows/summarize-route-condition.ts';
import '@/ai/flows/generate-repair-materials-list.ts';