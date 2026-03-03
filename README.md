# 🔍 Job Scout — PM Job Screener

Sistema local de screening de vagas para Product Manager com scoring por IA (Groq).

## Setup em 5 minutos

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com suas API keys
node server.js
```

### 2. Frontend (novo terminal)
```bash
cd frontend
npm install
npm start
```

Abre em **http://localhost:3000** automaticamente.

---

## Fontes de vagas

| Fonte | Método | Limite | Key necessária |
|-------|--------|--------|----------------|
| Remotive | API pública | Ilimitado | ❌ |
| Himalayas | API pública | Ilimitado | ❌ |
| **LinkedIn Direct** | npm scraping público | Ilimitado | ❌ |
| **WeWorkRemotely** | RSS scraper próprio | Ilimitado | ❌ |
| **Wellfound** | Playwright scraper próprio | Ilimitado | ❌ |
| **JSearch** (LinkedIn + Indeed + Glassdoor) | RapidAPI | 200 req/mês free | ✅ JSEARCH_API_KEY |
| SerpAPI (Google Jobs) | API | 100 req/mês free | ✅ SERP_API_KEY (backup) |
| Google Custom Search | API | 100 req/dia free | ✅ Opcional |

> WeWorkRemotely usa RSS público — muito estável.
> Wellfound usa Playwright (browser headless) — requer instalação do Chromium uma única vez.

## Setup completo

### 1. Backend
```bash
cd backend
npm install

# Instala o browser para o scraper do Wellfound (só precisa fazer uma vez)
npx playwright install chromium

cp .env.example .env
# Edite o .env com suas API keys
node server.js
```

### 2. Frontend (novo terminal)
```bash
cd frontend
npm install
npm start
```

Abre em **http://localhost:3000** automaticamente.

---

## Como obter as keys

| Key | Onde |
|-----|------|
| `GROQ_API_KEY` | https://console.groq.com |
| `JSEARCH_API_KEY` | https://rapidapi.com → buscar "JSearch by OpenWeb Ninja" → Subscribe Free |
| `SERP_API_KEY` | https://serpapi.com (backup, já pode ter) |
| `GOOGLE_API_KEY` + `GOOGLE_CX` | console.cloud.google.com + programmablesearchengine.google.com (opcional) |

---

## Como usar

1. **Run Scan** — busca vagas em todas as fontes, o Groq faz scoring de cada JD
2. Veja o **ranking** com score, highlights e red flags de cada vaga
3. Clique **Mark as Applied** nas que você aplicar
4. Acompanhe status na aba **Applications** (applied → interview → offer / rejected)
5. Aba **History** carrega qualquer scan anterior com os JDs salvos

---

## Personalizar critérios

Edite **`backend/config.js`** para ajustar:
- Títulos aceitos / bloqueados
- Skills prioritárias  
- Faixa salarial mínima
- Deal breakers
- Queries de busca
