import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Importar funções a serem testadas
import { isUSOnly, normalizeTitleForDedup, normalizeForId } from './scraper.js';
import { validateJob } from './utils/validator.js';
import { getCachedScoredJob, setCachedScoredJob, clearCache } from './utils/cache.js';

describe('scraper.js - Funções de Filtro', () => {
  
  describe('isUSOnly()', () => {
    it('should detect US-only patterns in title', () => {
      const job1 = { title: 'US only Product Manager', description: '', location: '' };
      assert.strictEqual(isUSOnly(job1), true);
      
      const job2 = { title: 'Product Manager - USA only', description: '', location: '' };
      assert.strictEqual(isUSOnly(job2), true);
    });
    
    it('should detect US authorization requirements in description', () => {
      const job = { 
        title: 'Product Manager', 
        description: 'Must be authorized to work in the US', 
        location: '' 
      };
      assert.strictEqual(isUSOnly(job), true);
    });
    
    it('should detect US states in location', () => {
      const job = { title: 'Product Manager', description: '', location: 'California' };
      assert.strictEqual(isUSOnly(job), true);
      
      const job2 = { title: 'Product Manager', description: '', location: 'New York' };
      assert.strictEqual(isUSOnly(job2), true);
    });
    
    it('should NOT flag remote or worldwide jobs', () => {
      const job1 = { title: 'Product Manager', description: '', location: 'Remote - Worldwide' };
      assert.strictEqual(isUSOnly(job1), false);
      
      const job2 = { title: 'Product Manager', description: '', location: 'Europe' };
      assert.strictEqual(isUSOnly(job2), false);
    });
  });
  
  describe('normalizeTitleForDedup()', () => {
    it('should remove remote suffixes', () => {
      const result = normalizeTitleForDedup('Senior Product Manager - Remote');
      assert.strictEqual(result, 'senior product manager');
    });
    
    it('should remove location suffixes', () => {
      const result = normalizeTitleForDedup('PM - Europe');
      assert.strictEqual(result, 'pm');
    });
    
    it('should remove parentheses content', () => {
      const result = normalizeTitleForDedup('Product Manager (Contract)');
      assert.strictEqual(result, 'product manager');
    });
    
    it('should handle various combinations', () => {
      const result = normalizeTitleForDedup('Senior PM - Remote - UK');
      assert.strictEqual(result, 'senior pm');
    });
  });
  
  describe('normalizeForId()', () => {
    it('should generate consistent IDs for same title/company', () => {
      const id1 = normalizeForId('Product Manager', 'Google');
      const id2 = normalizeForId('Product Manager', 'Google');
      assert.strictEqual(id1, id2);
    });
    
    it('should handle special characters', () => {
      const id = normalizeForId('Product Manager!', 'Company #1');
      assert.strictEqual(id, 'productmanager_company1');
    });
    
    it('should be case insensitive', () => {
      const id1 = normalizeForId('product manager', 'google');
      const id2 = normalizeForId('Product Manager', 'Google');
      assert.strictEqual(id1, id2);
    });
  });
});

describe('validator.js - Funções de Validação', () => {
  
  describe('validateJob()', () => {
    it('should validate a valid job', () => {
      const job = {
        title: 'Senior Product Manager',
        company: 'Tech Corp',
        location: 'Remote',
        url: 'https://example.com/job'
      };
      
      const result = validateJob(job);
      assert.strictEqual(result.valid, true);
    });
    
    it('should reject job without title', () => {
      const job = {
        company: 'Tech Corp',
        location: 'Remote'
      };
      
      const result = validateJob(job);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('title'));
    });
    
    it('should reject job without company', () => {
      const job = {
        title: 'Product Manager',
        location: 'Remote'
      };
      
      const result = validateJob(job);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('company'));
    });
    
    it('should accept job with optional fields', () => {
      const job = {
        title: 'PM',
        company: 'Startup',
        description: 'Great opportunity',
        salary: '100k',
        url: 'https://example.com'
      };
      
      const result = validateJob(job);
      assert.strictEqual(result.valid, true);
    });
  });
});

describe('cache.js - Funções de Cache', () => {
  
  beforeEach(() => {
    clearCache();
  });
  
  describe('getCachedScoredJob() / setCachedScoredJob()', () => {
    it('should store and retrieve a job', () => {
      const job = { 
        id: 'test-123', 
        title: 'PM', 
        company: 'Corp',
        score: 85 
      };
      
      setCachedScoredJob('test-123', job);
      const cached = getCachedScoredJob('test-123');
      
      assert.deepStrictEqual(cached, job);
    });
    
    it('should return null for non-existent job', () => {
      const cached = getCachedScoredJob('non-existent');
      assert.strictEqual(cached, null);
    });
  });
});