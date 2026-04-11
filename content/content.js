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
            } catch { /* skip */ }

            if (typeCode === null) continue;
            if (typeCode === 13) continue;

            let type = QUESTION_TYPES[typeCode] ?? `unknown_${typeCode}`;
            if (type === 'grid') type = isCheckboxGrid ? 'checkbox_grid' : 'radio_grid';

            const titleEl = component.querySelector('.M7eMe');
            const title = titleEl ? titleEl.textContent.trim() : '';

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

            questions.push({ title, type, options });
        }

        return questions;
    }

    function injectSolveButton(container) {
        if (document.getElementById('gff-solve-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'gff-solve-btn';
        btn.textContent = 'Solve';
        btn.setAttribute('type', 'button');

        btn.addEventListener('click', () => {
            const questions = parseQuestions();
            console.log('[GFF] Parsed questions:', JSON.stringify(questions, null, 2));
            console.log(`[GFF] Total: ${questions.length} questions`);
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