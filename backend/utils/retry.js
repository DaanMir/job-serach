// backend/utils/retry.js

/**
 * Executa uma função com retry automático e backoff exponencial.
 * @param {Function} fn - Função assíncrona a ser executada
 * @param {Object} options - Opções de retry
 * @param {number} options.maxRetries - Número máximo de tentativas (padrão: 3)
 * @param {number} options.baseDelay - Delay base em ms (padrão: 1000)
 * @param {number} options.maxDelay - Delay máximo em ms (padrão: 10000)
 * @param {Function} options.shouldRetry - Função que determina se deve tentar novamente (padrão: sempre retry em erro)
 * @param {string} options.context - Contexto para logs (ex: nome do scraper)
 * @returns {Promise<any>} Resultado da função
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
    context = 'unknown'
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const shouldRetryAttempt = attempt < maxRetries && shouldRetry(error, attempt);
      
      if (!shouldRetryAttempt) {
        throw error;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      console.warn(`[retry:${context}] Attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Cria uma versão com retry de uma função.
 * @param {Function} fn - Função a ser envolvida
 * @param {Object} options - Opções de retry
 * @returns {Function} Função com retry automático
 */
export function withRetryFn(fn, options = {}) {
  return (...args) => withRetry(() => fn(...args), options);
}