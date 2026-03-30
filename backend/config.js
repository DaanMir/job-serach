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
  acceptWorldwide: true,

  // Salário mínimo aceitável
  salary: {
    contractMinPerDay: 400,
    contractIdealPerDay: 600,
    permanentMinPerYear: 70000,
    permanentIdealPerYear: 90000,
  },

  // Deal breakers absolutos
  dealBreakers: [
    "on-site", "on site", "fully on-site", "office only",
    "no remote", "must be in office",
    "junior", "entry level", "intern",
  ],
};

// ============================================================
// CANDIDATE_PROFILE — usado pelo LLM scorer (scorer.js)
// Mantenha este objeto atualizado com seu perfil real.
// NÃO commite dados sensíveis se o repo for público —
// mova para .env ou use placeholders genéricos.
// ============================================================
export const CANDIDATE_PROFILE = {
  // Resumo de senioridade e foco
  seniority: "Senior PM with 5+ years building AI/ML products, enterprise platforms, and multi-agent systems",

  // Experiências-chave (use nomes genéricos se o repo for público)
  highlights: [
    "Improved production LLM accuracy from 74% to 97% for Open Finance at a major card network",
    "Built enterprise monitoring platform generating $2M annual savings at a global telco/tech company",
    "Built RLM Framework — personal multi-agent orchestration project with 8 specialized AI agents using Anthropic API, adopted by 23+ professionals",
    "Built Azure DevOps MCP server reducing Feature/User Story creation from 15-20 min to ~30 seconds",
  ],

  // Stack técnico relevante para scoring
  techStack: [
    "Anthropic API", "LLM products", "MCP servers", "AI agents",
    "Azure / Azure DevOps", "C# .NET", "Node.js", "Python",
    "Grafana", "Victoria Metrics", "PromQL", "Observability tooling",
    "Open Finance / Open Banking",
  ],

  // Restrições de localização e trabalho
  location: "EU-based (Italy), fully remote only — cannot relocate",
  languages: "Fluent English and Portuguese, basic Italian",
  targetRoles: "Remote-first senior IC or lead PM roles, EU or worldwide",

  // Preferências de empresa/domínio
  domainFit: [
    "AI-native products", "LLM platforms", "Fintech / Open Finance",
    "Enterprise B2B SaaS", "Developer tooling", "Observability / monitoring",
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

// ============================================================
// Queries do LinkedIn via Apify
// Movidas para cá para facilitar configuração
// ============================================================
export const LINKEDIN_SEARCH_QUERIES = [
  { keywords: "Senior Product Manager AI LLM", location: "Europe" },
  { keywords: "Head of Product AI fintech", location: "Europe" },
  { keywords: "Technical Product Manager AI agents", location: "Europe" },
  { keywords: "Lead Product Manager enterprise B2B", location: "Worldwide" },
  { keywords: "Principal Product Manager AI ML", location: "Europe" },
  { keywords: "Senior Product Manager open finance", location: "Europe" },
  { keywords: "Group Product Manager AI", location: "Europe" },
  { keywords: "Staff Product Manager fintech", location: "Worldwide" },
  { keywords: "Product Manager MCP", location: "Europe" },
  { keywords: "VP of Product AI startup", location: "Europe" },
  { keywords: "Director of Product AI platform", location: "Europe" },
  { keywords: "Senior Technical Product Manager API", location: "Europe" },
  { keywords: "AI Product Manager LLM agents", location: "Worldwide" },
  { keywords: "Lead Product Manager payments fintech", location: "Europe" },
  { keywords: "Principal Product Manager observability", location: "Worldwide" },
  { keywords: "Group Product Manager platform SaaS", location: "Europe" },
  { keywords: "Staff Product Manager enterprise B2B", location: "Europe" },
  { keywords: "Product Owner AI ML", location: "Europe" },
  { keywords: "Senior Product Manager monitoring", location: "Worldwide" },
  { keywords: "Head of Product open banking", location: "Europe" },
  { keywords: "VP of Product fintech platform", location: "Europe" },
  { keywords: "Technical Product Manager MCP agents", location: "Europe" },
  { keywords: "Lead Product Manager data AI", location: "Europe" },
  { keywords: "Principal Product Manager growth PM", location: "Worldwide" },
  { keywords: "Product Manager AI developer tools", location: "Europe" },
];

// Quantidade de vagas por query (aumentar para mais resultados)
export const LINKEDIN_JOBS_PER_QUERY = 50;

// ============================================================
// Queries do JSearch (RapidAPI)
// =================================================================
export const JSEARCH_QUERIES = [
  "Senior Product Manager AI remote Europe",
  "Head of Product LLM fintech remote",
  "Technical Product Manager AI agents remote EU",
  "Lead Product Manager enterprise B2B remote",
  "Principal Product Manager AI ML remote",
  "Group Product Manager fintech payments remote Europe",
  // Novas queries para maior cobertura
  "Product Manager MCP AI agents remote",
  "Director of Product enterprise B2B remote Europe",
  "Staff Product Manager fintech open banking remote",
  "VP of Product AI startup remote",
];

export const JSEARCH_OPTIONS = {
  pagesPerQuery: 1,
  datePosted: "month",
  remoteJobsOnly: true,
  employmentTypes: "FULLTIME,CONTRACTOR",
};
