const DEFAULT_CONFIG = {
    apiKey: 'KEY',
    model: 'gemini-3.1-flash-lite-preview',
};

const MAX_RETRIES = 3;
const SKIP_KEYWORD = '__SKIP__';

async function getConfig() {
    const { config } = await chrome.storage.local.get('config');
    return { ...DEFAULT_CONFIG, ...config };
}

function buildPrompt(question) {
    const { title, type, options } = question;

    const optionsBlock = options !== null
        ? `\nAvailable options:\n${JSON.stringify(options, null, 2)}`
        : '';

    return `You are an assistant that answers Google Form questions with factual, objectively correct answers.

LANGUAGE RULE:
Respond in the same language as the question text. If the question is in Ukrainian — answer in Ukrainian. If in English — answer in English. And so on.

SKIP RULE:
If the question is personal (asks for name, surname, email, phone, personal opinion, personal experience, preferences, or any information unique to a specific person), OR if there is no single objectively correct answer — respond with exactly:
{"answer": "${SKIP_KEYWORD}"}

RESPONSE FORMAT:
Always respond with a single valid JSON object. No markdown, no code blocks, no explanation — just the raw JSON.

The answer field format depends on the question type:

- short_answer / paragraph
  {"answer": "text string"}

- multiple_choice / dropdown
  {"answer": "exact text of one option"}
  The value MUST exactly match one of the provided options.

- checkboxes
  {"answer": ["option A", "option B"]}
  The values MUST exactly match items from the provided options list.

- linear_scale
  {"answer": 7}
  The value MUST be an integer within the min–max range provided.

- rating
  {"answer": 5}
  The value MUST be an integer from 1 to max.

- radio_grid
  {"answer": {"row label": "column label", "row label 2": "column label 2"}}
  Every row MUST have exactly one column value. Values MUST exactly match provided rows/columns.

- checkbox_grid
  {"answer": {"row label": ["col A", "col B"], "row label 2": ["col C"]}}
  Each row can have one or more column values. Values MUST exactly match provided rows/columns.

- date
  {"answer": "YYYY-MM-DD"}

- time
  {"answer": "HH:MM"}

---

QUESTION:
Type: ${type}
Text: ${title}${optionsBlock}`;
}

async function callGemini(prompt, config) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0,
            maxOutputTokens: 512,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        const message = err?.error?.message ?? response.statusText;

        if (status === 429) {
            const details = err?.error?.details ?? [];

            const retryInfo = details.find(d => d['@type']?.includes('RetryInfo'));
            const retryDelay = retryInfo?.retryDelay;
            const retryAfterHeader = response.headers.get('Retry-After');

            const isQuotaExhausted = !retryDelay
                && !retryAfterHeader
                && /quota|exceeded|limit/i.test(message);

            if (isQuotaExhausted) {
                throw Object.assign(new Error(message), { status, quotaExhausted: true });
            }

            let waitSeconds = 60;
            if (retryDelay) {
                waitSeconds = parseInt(retryDelay) || waitSeconds;
            } else if (retryAfterHeader) {
                waitSeconds = parseInt(retryAfterHeader) || waitSeconds;
            }

            throw Object.assign(new Error(message), { status, waitSeconds });
        }

        throw Object.assign(new Error(message), { status });
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
}

async function solveQuestion(question) {
    const config = await getConfig();
    const prompt = buildPrompt(question);

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await callGemini(prompt, config);

            if (result?.answer === undefined) {
                throw new Error('Response missing "answer" field');
            }

            const skipped = result.answer === SKIP_KEYWORD;
            return { success: true, answer: result.answer, skipped };

        } catch (err) {
            lastError = err;
            console.warn(`[GFF] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

            if (err.status === 429 && err.quotaExhausted) {
                return { success: false, quotaExhausted: true };
            }

            if (err.status === 429) {
                return { success: false, rateLimited: true, waitSeconds: err.waitSeconds ?? 60 };
            }

            if (err.status === 400 || err.status === 403) break;

            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 500 * attempt));
            }
        }
    }

    return { success: false, error: lastError?.message ?? 'Unknown error' };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SOLVE_QUESTION') {
        solveQuestion(message.question).then(sendResponse);
        return true;
    }
});