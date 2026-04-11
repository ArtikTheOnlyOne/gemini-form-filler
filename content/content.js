(() => {
    const QUESTION_TYPES = {
        0: 'short_answer',
        1: 'paragraph',
        2: 'multiple_choice',
        3: 'dropdown',
        4: 'checkboxes',
        5: 'linear_scale',
        7: 'grid',
        9: 'date',
        10: 'time',
        13: 'file_upload',
        18: 'rating',
    };

    const ICONS = {
        pending: chrome.runtime.getURL('states/pending.svg'),
        solving: chrome.runtime.getURL('states/solving.svg'),
        success: chrome.runtime.getURL('states/success.svg'),
        failure: chrome.runtime.getURL('states/failure.svg'),
        skipped: chrome.runtime.getURL('states/skipped.svg'),
    };

    function parseMultipleChoice(el) {
        return [...el.querySelectorAll('[role="radio"][data-value]')]
            .map(r => r.getAttribute('data-value'))
            .filter(Boolean);
    }

    function parseCheckboxes(el) {
        return [...el.querySelectorAll('[role="checkbox"][data-answer-value]')]
            .map(c => c.getAttribute('data-answer-value'))
            .filter(Boolean);
    }

    function parseDropdown(el) {
        return [...el.querySelectorAll('[role="option"][data-value]')]
            .map(o => o.getAttribute('data-value'))
            .filter(v => v !== '');
    }

    function parseLinearScale(el) {
        const radios = [...el.querySelectorAll('[role="radio"][data-value]')];
        if (!radios.length) return null;

        const values = radios.map(r => Number(r.getAttribute('data-value')));
        const min = Math.min(...values);
        const max = Math.max(...values);

        const minLabel = el.querySelector('[jsname="NfjK7"]')?.textContent.trim() ?? '';
        const maxLabel = el.querySelector('[jsname="jq1lEb"]')?.textContent.trim() ?? '';

        return { min, max, min_label: minLabel, max_label: maxLabel };
    }

    function parseRating(el) {
        const labels = [...el.querySelectorAll('label[data-ratingscale]')];
        if (!labels.length) return null;
        const max = Math.max(...labels.map(l => Number(l.getAttribute('data-ratingscale'))));
        return { max };
    }

    function parseGrid(el, isCheckbox) {
        const headerRow = el.querySelector('.KZt9Tc');
        const columns = headerRow
            ? [...headerRow.querySelectorAll('.V4d7Ke.OIC90c')].map(c => c.textContent.trim())
            : [];

        const rowRole = isCheckbox ? '[role="group"]' : '[role="radiogroup"]';
        const rows = [...el.querySelectorAll(rowRole)]
            .map(g => g.querySelector('.V4d7Ke.wzWPxe')?.textContent.trim())
            .filter(Boolean);

        return { rows, columns };
    }

    function injectStateIcon(questionEl, state) {
        const z12JJ = questionEl.querySelector('.z12JJ');
        if (!z12JJ) return;

        if (z12JJ.querySelector('.gff-state-icon')) return;

        const img = document.createElement('img');
        img.className = 'gff-state-icon';
        img.src = ICONS[state];
        img.alt = state;

        switch (state) {
            case 'pending':
                img.title = 'Pending';
                break;
            case 'solving':
                img.title = 'Solving...';
                break;
            case 'success':
                img.title = 'Solved successfully';
                break;
            case 'failure':
                img.title = 'Failed to solve';
                break;
            case 'skipped':
                img.title = 'Skipped';
                break;
        }

        img.dataset.gffState = state;

        z12JJ.appendChild(img);
    }

    function setStateIcon(questionEl, state) {
        const icon = questionEl.querySelector('.gff-state-icon');
        if (!icon) {
            injectStateIcon(questionEl, state);
            return;
        }
        icon.src = ICONS[state];
        icon.alt = state;

        switch (state) {
            case 'pending':
                icon.title = 'Pending';
                break;
            case 'solving':
                icon.title = 'Solving...';
                break;
            case 'success':
                icon.title = 'Solved successfully';
                break;
            case 'failure':
                icon.title = 'Failed to solve';
                break;
            case 'skipped':
                icon.title = 'Skipped';
                break;
        }

        icon.dataset.gffState = state;
    }

    function parseQuestions() {
        const items = document.querySelectorAll('.o3Dpx .Qr7Oae');
        if (!items.length) return [];

        const questions = [];

        for (const item of items) {
            const component = item.querySelector('[jsmodel="CP1oW"]');
            if (!component) continue;

            let typeCode = null;
            let isCheckboxGrid = false;

            try {
                const raw = component.getAttribute('data-params');
                const match = raw.match(/^%\.@\.\[(\d+),"[^"]*",null,(\d+),/);
                if (match) typeCode = parseInt(match[2], 10);
                if (typeCode === 7) isCheckboxGrid = /,\[true\]/.test(raw);
            } catch { injectStateIcon(item, 'failure'); }

            if (typeCode === null) continue;

            let type = QUESTION_TYPES[typeCode] ?? `unknown_${typeCode}`;
            if (type === 'grid') type = isCheckboxGrid ? 'checkbox_grid' : 'radio_grid';

            const titleEl = component.querySelector('.M7eMe');
            const title = titleEl ? titleEl.textContent.trim() : '';

            if (type === 'file_upload') {
                injectStateIcon(item, 'skipped');
                continue;
            }

            let options = null;

            switch (type) {
                case 'multiple_choice':
                    options = parseMultipleChoice(item);
                    break;
                case 'checkboxes':
                    options = parseCheckboxes(item);
                    break;
                case 'dropdown':
                    options = parseDropdown(item);
                    break;
                case 'linear_scale':
                    options = parseLinearScale(item);
                    break;
                case 'rating':
                    options = parseRating(item);
                    break;
                case 'radio_grid':
                    options = parseGrid(item, false);
                    break;
                case 'checkbox_grid':
                    options = parseGrid(item, true);
                    break;
            }

            const existingState = item.querySelector('.gff-state-icon')?.dataset.gffState;
            if (existingState === 'success' || existingState === 'skipped') continue;

            injectStateIcon(item, 'pending');
            questions.push({ title, type, options, element: item });
        }

        return questions;
    }

    function isContextValid() {
        try { return !!chrome.runtime?.id; } catch { return false; }
    }

    async function safeSendMessage(payload, { attempts = 3, delay = 300 } = {}) {
        if (!isContextValid()) throw new Error('Extension was reloaded — please refresh the page.');

        for (let i = 1; i <= attempts; i++) {
            try {
                return await chrome.runtime.sendMessage(payload);
            } catch (err) {
                const isConnectionError = err.message?.includes('Receiving end does not exist')
                    || err.message?.includes('Could not establish connection');

                if (!isConnectionError || i === attempts) throw err;

                console.warn(`[GFF] SW not ready, retrying (${i}/${attempts})…`);
                await new Promise(r => setTimeout(r, delay * i));
            }
        }
    }

    function fillTextInput(input, value) {
        input.focus();
        input.select();
        const inserted = document.execCommand('insertText', false, String(value));
        if (!inserted || input.value !== String(value)) {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
                'value'
            )?.set;
            if (nativeSetter) nativeSetter.call(input, String(value));
            input.dispatchEvent(new InputEvent('input', { bubbles: true, data: String(value) }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        input.blur();
    }

    function fillShortAnswer(el, answer) {
        const input = el.querySelector('input.whsOnd[jsname="YPqjbf"]');
        if (input) fillTextInput(input, answer);
    }

    function fillParagraph(el, answer) {
        const textarea = el.querySelector('textarea[jsname="YPqjbf"]');
        if (textarea) fillTextInput(textarea, answer);
    }

    function fillMultipleChoice(el, answer) {
        const radio = el.querySelector(`[aria-label="${CSS.escape(answer)}"][role="radio"]`);
        radio?.click();
    }

    function fillCheckboxes(el, answers) {
        const list = Array.isArray(answers) ? answers : [answers];
        for (const answer of list) {
            const box = el.querySelector(`[aria-label="${CSS.escape(answer)}"][role="checkbox"]`);
            if (box && box.getAttribute('aria-checked') !== 'true') box.click();
        }
    }

    function fillDropdown(el, answer) {
        const listbox = el.querySelector('[role="listbox"]');
        if (!listbox) return;

        const strAnswer = String(answer);

        const prevSelected = listbox.querySelector('[role="option"].KKjvXb');
        if (prevSelected) {
            prevSelected.classList.remove('KKjvXb', 'DEh1R');
            prevSelected.classList.add('OIC90c');
            prevSelected.setAttribute('aria-selected', 'false');
        }

        const target = listbox.querySelector(`[role="option"][data-value="${CSS.escape(strAnswer)}"]`);
        if (!target) return;
        target.classList.add('KKjvXb', 'DEh1R');
        target.classList.remove('OIC90c');
        target.setAttribute('aria-selected', 'true');

        const displaySpan = listbox.querySelector('[jsname="wQNmvb"][data-value=""] .vRMGwf');
        if (displaySpan) displaySpan.textContent = target.querySelector('.vRMGwf')?.textContent ?? strAnswer;

        const dataParams = el.querySelector('[jsmodel="CP1oW"]')?.getAttribute('data-params') ?? '';
        const entryMatch = dataParams.match(/null,3,\[\[(\d+),/);
        if (entryMatch) {
            const hiddenInput = document.querySelector(`input[name="entry.${entryMatch[1]}"]`);
            if (hiddenInput) {
                hiddenInput.value = strAnswer;
                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    function fillLinearScale(el, answer) {
        const radio = el.querySelector(`[data-value="${CSS.escape(String(answer))}"][role="radio"]`);
        radio?.click();
    }

    function fillRating(el, answer) {
        const label = el.querySelector(`label[data-ratingscale="${answer}"]`);
        const radio = label?.querySelector('[role="radio"]');
        radio?.click();
    }

    function fillRadioGrid(el, answer) {
        for (const [row, col] of Object.entries(answer)) {
            const group = el.querySelector(`[aria-label="${CSS.escape(row)}"][role="radiogroup"]`);
            if (!group) continue;
            const radio = group.querySelector(`[data-value="${CSS.escape(col)}"]`);
            radio?.click();
        }
    }

    function fillCheckboxGrid(el, answer) {
        for (const [row, cols] of Object.entries(answer)) {
            const list = Array.isArray(cols) ? cols : [cols];
            for (const col of list) {
                const ariaLabel = `${col}, відповідь для ${row}`;
                const box = el.querySelector(`[aria-label="${CSS.escape(ariaLabel)}"]`);
                if (box && box.getAttribute('aria-checked') !== 'true') box.click();
            }
        }
    }

    function fillDate(el, answer) {
        const input = el.querySelector('input[type="date"]');
        if (!input) return;
        input.focus();
        input.value = answer;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
    }

    function fillTime(el, answer) {
        const [hh, mm] = String(answer).split(':');
        const hourInput = el.querySelector('input[aria-label="Години"]');
        const minInput = el.querySelector('input[aria-label="Хвилини"]');
        if (hourInput) fillTextInput(hourInput, hh.padStart(2, '0'));
        if (minInput) fillTextInput(minInput, mm?.padStart(2, '0') ?? '00');
    }

    function fillAnswer(question, answer) {
        const el = question.element;
        switch (question.type) {
            case 'short_answer': fillShortAnswer(el, answer); break;
            case 'paragraph': fillParagraph(el, answer); break;
            case 'multiple_choice': fillMultipleChoice(el, answer); break;
            case 'checkboxes': fillCheckboxes(el, answer); break;
            case 'dropdown': fillDropdown(el, answer); break;
            case 'linear_scale': fillLinearScale(el, answer); break;
            case 'rating': fillRating(el, answer); break;
            case 'radio_grid': fillRadioGrid(el, answer); break;
            case 'checkbox_grid': fillCheckboxGrid(el, answer); break;
            case 'date': fillDate(el, answer); break;
            case 'time': fillTime(el, answer); break;
        }
    }

    function showRateLimitBanner(waitSeconds, btn, onRetry) {
        const existing = document.getElementById('gff-rate-banner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'gff-rate-banner';

        const msg = document.createElement('span');
        banner.appendChild(msg);

        const retryBtn = document.createElement('button');
        retryBtn.id = 'gff-retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.disabled = true;
        banner.appendChild(retryBtn);

        btn.parentElement.insertBefore(banner, btn.nextSibling);

        let remaining = waitSeconds;

        const tick = () => {
            msg.textContent = `Rate limit reached. Resuming in ${remaining}s…`;
        };
        tick();

        const timer = setInterval(() => {
            remaining--;
            tick();
            if (remaining <= 0) {
                clearInterval(timer);
                msg.textContent = 'Rate limit lifted. Ready to resume.';
                retryBtn.disabled = false;
            }
        }, 1000);

        retryBtn.addEventListener('click', () => {
            banner.remove();
            onRetry();
        });
    }

    async function solveQuestions(questions) {
        const btn = document.getElementById('gff-solve-btn');
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];

            if (!isContextValid()) {
                for (const q of questions) {
                    if (q.element.querySelector('.gff-state-icon')?.dataset.gffState === 'solving') {
                        setStateIcon(q.element, 'failure');
                    }
                }
                btn.textContent = 'Reload page ↺';
                btn.disabled = false;
                btn.onclick = () => location.reload();
                return;
            }

            setStateIcon(question.element, 'solving');

            let response;
            try {
                response = await safeSendMessage({
                    type: 'SOLVE_QUESTION',
                    question: { title: question.title, type: question.type, options: question.options },
                });
            } catch (err) {
                setStateIcon(question.element, 'failure');
                console.warn(`[GFF] Message failed: "${question.title}"`, err.message);
                continue;
            }

            if (response?.quotaExhausted) {
                setStateIcon(question.element, 'failure');
                for (let j = i + 1; j < questions.length; j++) {
                    setStateIcon(questions[j].element, 'failure');
                }
                btn.textContent = 'Solve';
                btn.disabled = false;
                alert('Gemini API quota exhausted.\n\nYou have reached your daily or per-minute request limit. Please wait before trying again or check your API quota in Google AI Studio.');
                return;
            }

            if (response?.rateLimited) {
                setStateIcon(question.element, 'pending');
                console.warn(`[GFF] Rate limited. Retry after ${response.waitSeconds}s`);

                btn.disabled = true;
                btn.textContent = 'Rate limited…';

                await new Promise(resolve => {
                    showRateLimitBanner(response.waitSeconds, btn, resolve);
                });

                btn.disabled = true;
                btn.textContent = 'Solving…';
                i--;
                continue;
            }

            if (!response?.success) {
                setStateIcon(question.element, 'failure');
                console.warn(`[GFF] Failed: "${question.title}"`, response?.error);
                continue;
            }

            if (response.skipped) {
                setStateIcon(question.element, 'skipped');
                console.log(`[GFF] Skipped: "${question.title}"`);
                continue;
            }

            setStateIcon(question.element, 'success');
            console.log(`[GFF] Solved: "${question.title}"`, response.answer);

            fillAnswer(question, response.answer);
        }
    }

    function injectSolveButton(container) {
        if (document.getElementById('gff-solve-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'gff-solve-btn';
        btn.textContent = 'Solve';
        btn.setAttribute('type', 'button');

        btn.addEventListener('click', async () => {
            const { config } = await chrome.storage.local.get('config');
            if (!config?.apiKey || !config?.model) {
                alert('Gemini Form Filler is not configured.\n\nPlease open the extension popup, enter your API key and select a model.');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Solving…';

            const questions = parseQuestions();
            console.log('[GFF] Starting, questions:', questions.length);

            await solveQuestions(questions);

            btn.textContent = 'Solve';
            btn.disabled = false;
        });

        container.insertBefore(btn, container.firstChild);
    }

    function init() {
        const questionsContainer = document.querySelector('.o3Dpx');
        if (!questionsContainer) return;
        injectSolveButton(questionsContainer);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();