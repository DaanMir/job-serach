// ============================================================
// JOB SCOUT - CONFIGURAÇÃO DO PERFIL
// Edite aqui seus critérios de busca e perfil
// ============================================================

export const PROFILE = {
  name: "Job Seeker",

  // Títulos aceitos (case-insensitive)
  targetTitles: [
    "Product Manager",
    "Senior Product Manager",
    "Lead Product Manager",
    "Principal Product Manager",
    "Staff Product Manager",
    "Technical Product Manager",
    "AI Product Manager",
    "Product Owner",
    "Group Product Manager",
    "Head of Product",
    "Director of Product",
    "VP of Product",
    "GPM",
  ],

  // Títulos bloqueados (descarte imediato)
  blockedTitles: [
    "Junior",
    "Associate",
    "Entry Level",
    "Intern",
    "Internship",
    "Graduate",
  ],

  // Palavras-chave do perfil para matching
  skills: [
    "AI", "ML", "LLM", "Machine Learning", "Artificial Intelligence",
    "MCP", "Model Context Protocol", "AI Agents",
    "Fintech", "Open Finance", "Banking", "Payments", "Mastercard",
    "Enterprise B2B", "SaaS", "Platform",
    "Monitoring", "Observability",
    "API", "Microservices",
    "Azure", "Cloud",
    "Python", "C#", ".NET",
    "Agile", "Scrum",
    "Roadmap", "Stakeholder",
    "Cross-functional",
  ],

  // Domínios prioritários
  domains: [
    "AI/ML", "Fintech", "Open Finance", "Enterprise B2B",
    "Technical Platform", "LLM Products", "AI Agents",
    "Monitoring", "Banking", "Payments",
  ],

  // Localização preferida
  locationPreference: "EU timezone / EU-based",
  acceptWorldwide: true, // aceita worldwide se score for muito alto

  // Salário mínimo aceitável
  salary: {
    contractMinPerDay: 400,    // €/dia mínimo (abaixo = red flag)
    contractIdealPerDay: 600,  // €/dia ideal
    permanentMinPerYear: 70000, // €/ano mínimo
    permanentIdealPerYear: 90000, // €/ano ideal
  },

  // Deal breakers absolutos
  dealBreakers: [
    "on-site", "on site", "fully on-site", "office only",
    "no remote", "must be in office",
    "junior", "entry level", "intern",
  ],
};

// Termos de busca para as APIs
export const SEARCH_QUERIES = [
  "Senior Product Manager AI remote Europe",
  "Head of Product AI ML remote Europe",
  "Technical Product Manager fintech remote",
  "Lead Product Manager LLM AI agents remote",
  "Senior PM enterprise B2B remote Europe",
  "Group Product Manager AI remote",
  "Director of Product fintech remote Europe",
];

export const SERP_LINKEDIN_QUERIES = [
  "Senior Product Manager AI LLM remote Europe",
  "Head of Product AI agents MCP remote",
  "Technical Product Manager fintech open finance remote Europe",
  "Lead Product Manager enterprise B2B remote EU",
];
