// backend/utils/validator.js
import { z } from 'zod';

// Schema para validação de vagas
export const jobSchema = z.object({
  id: z.string().optional(),
  source: z.string().optional(),
  title: z.string().min(1, "Title é obrigatório"),
  company: z.string().min(1, "Company é obrigatório"),
  location: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  salary: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  // Campos de scoring (opcionais - preenchidos depois)
  score: z.number().optional(),
  baseScore: z.number().optional(),
  qualityBonus: z.number().optional(),
  recommendation: z.string().optional(),
  matchedSkills: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
  redFlags: z.array(z.string()).optional(),
  salaryAssessment: z.string().optional(),
  locationAssessment: z.string().optional(),
  seniorityMatch: z.string().optional(),
  summary: z.string().optional(),
  scoreBreakdown: z.array(z.object({
    rule: z.string(),
    pts: z.number()
  })).optional(),
  scored: z.boolean().optional(),
});

// Schema para validação de aplicações
export const applicationSchema = z.object({
  jobId: z.string().optional(),
  title: z.string().min(1, "Title é obrigatório"),
  company: z.string().min(1, "Company é obrigatório"),
  url: z.string().url().optional().or(z.literal('')),
  score: z.number().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  matchedSkills: z.array(z.string()).optional(),
  salary: z.string().optional(),
  notes: z.string().optional(),
});

// Função para validar e sanitizar uma vaga
export function validateJob(job) {
  try {
    // Remove campos undefined e null antes de validar
    const sanitized = {
      ...Object.fromEntries(
        Object.entries(job).filter(([_, v]) => v !== undefined)
      )
    };
    return { valid: true, data: jobSchema.parse(sanitized) };
  } catch (error) {
    return { 
      valid: false, 
      error: error.errors ? error.errors.map(e => `${e.path}: ${e.message}`).join(', ') : error.message 
    };
  }
}

// Função para validar aplicação
export function validateApplication(app) {
  try {
    const sanitized = {
      ...Object.fromEntries(
        Object.entries(app).filter(([_, v]) => v !== undefined)
      )
    };
    return { valid: true, data: applicationSchema.parse(sanitized) };
  } catch (error) {
    return { 
      valid: false, 
      error: error.errors ? error.errors.map(e => `${e.path}: ${e.message}`).join(', ') : error.message 
    };
  }
}
