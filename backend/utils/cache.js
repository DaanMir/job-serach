// backend/utils/cache.js

// Cache em memória para resultados de scoring LLM
const jobCache = new Map();

// TTL padrão: 24 horas (em ms)
const DEFAULT_TTL_HOURS = 24;

/**
 * Define o TTL do cache em horas.
 */
export function setCacheTTL(hours) {
  process.env.CACHE_TTL_HOURS = hours;
}

function getTTL() {
  const envTTL = process.env.CACHE_TTL_HOURS;
  return envTTL ? parseInt(envTTL, 10) * 60 * 60 * 1000 : DEFAULT_TTL_HOURS * 60 * 60 * 1000;
}

/**
 * Obtém uma vaga do cache se não estiver expirada.
 * @param {string} id - ID da vaga
 * @returns {Object|null} Vaga cached ou null se não encontrada/expirada
 */
export function getCachedScoredJob(id) {
  const cached = jobCache.get(id);
  if (!cached) return null;
  
  const ttl = getTTL();
  const isExpired = Date.now() - cached.timestamp > ttl;
  
  if (isExpired) {
    jobCache.delete(id);
    console.log(`[cache] Cache expirado para job ${id}`);
    return null;
  }
  
  return cached.job;
}

/**
 * Armazena uma vaga no cache com timestamp.
 * @param {string} id - ID da vaga
 * @param {Object} job - Objeto da vaga com scoring
 */
export function setCachedScoredJob(id, job) {
  jobCache.set(id, { job, timestamp: Date.now() });
}

/**
 * Remove uma vaga específica do cache.
 * @param {string} id - ID da vaga
 */
export function invalidateCachedJob(id) {
  jobCache.delete(id);
}

/**
 * Limpa todo o cache.
 */
export function clearCache() {
  jobCache.clear();
  console.log('[cache] Cache limpo');
}

/**
 * Retorna estatísticas do cache.
 */
export function getCacheStats() {
  const ttl = getTTL();
  const now = Date.now();
  let expired = 0;
  let valid = 0;
  
  for (const [id, cached] of jobCache) {
    if (now - cached.timestamp > ttl) {
      expired++;
    } else {
      valid++;
    }
  }
  
  return {
    total: jobCache.size,
    valid,
    expired,
    ttlHours: ttl / (60 * 60 * 1000)
  };
}