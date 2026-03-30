// backend/utils/env.validator.js

const REQUIRED_ENV_VARS = ['GROQ_API_KEY'];

const OPTIONAL_ENV_VARS = [
  'APIFY_TOKEN',
  'JSEARCH_API_KEY',
  'SERP_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_CX'
];

export function validateEnv() {
  const errors = [];
  const warnings = [];

  // Check required vars
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName] || process.env[varName].includes('your_')) {
      errors.push(varName);
    }
  }

  // Check optional vars
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName] || process.env[varName].includes('your_')) {
      warnings.push(varName);
    }
  }

  return { errors, warnings };
}

export function printEnvStatus() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const { errors, warnings } = validateEnv();
  
  console.log('\n=== Environment Validation ===');
  console.log(`   Modo: ${nodeEnv === 'production' ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERROS (variáveis obrigatórias faltando):');
    errors.forEach(v => console.log(`   - ${v}`));
  } else {
    console.log('\n✅ Todas as variáveis obrigatórias estão configuradas');
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ AVISOS (recursos opcionais desabilitados):');
    warnings.forEach(v => console.log(`   - ${v}`));
  }
  
  console.log('=================================\n');
}