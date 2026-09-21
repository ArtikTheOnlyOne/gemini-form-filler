# Gemini Form Filler

A browser extension for Chromium-based browsers (Chrome, Edge, Opera) that automatically fills Google Forms using the Google Gemini AI.

> **Disclaimer:** This extension uses an AI model to generate answers. AI makes mistakes — answers may be incorrect, incomplete, or inappropriate. Always review filled answers before submitting. The author takes no responsibility for the results of form submissions made using this extension.

---

## Installation

<!-- The extension is available for download from:
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/gemini-form-filler/jkbdobafeneimelhcjcamkhmpnlkdmha/)
- [Chrome Web Store](https://chromewebstore.google.com/detail/gemini-form-filler/njegmkogepejmpdpobokahnaogepgdbi/)
- [Opera add-ons](https://addons.opera.com/en/extensions/details/gemini-form-filler/)

You can also use it unpacked: -->
1. Download or clone this repository
2. Open your browser and navigate to the extensions page:
   - Chrome / Opera: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode** (toggle in the top right corner)
4. Click **Load unpacked** and select the repository folder
5. The extension icon will appear in your browser toolbar

---

## Setup

Before using the extension, you need a Google Gemini API key.

### Getting an API key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **Get API key** and create a new key

### Configuring the extension

1. Click the extension icon in the toolbar to open the popup
2. Paste your API key into the input field
3. Click **Load models**
4. If the key is valid, a dropdown will appear with available models
5. Select the model you want to use for processing forms
6. Your settings are saved automatically

The model list is refreshed every time you open the popup. If a previously selected model becomes unavailable, you will be prompted to choose a new one.

---

## Usage

1. Open any Google Form in your browser
2. A **Process** button will appear at the top of the form
3. Click **Process** — the extension will process each question one by one
4. Each question gets a status icon showing the result (see below)
5. Review all filled answers before submitting the form

**Rerunning:** Clicking **Process** again will only process questions marked as failed. Already processed and skipped questions will not be reprocessed.

---

## Status icons

| Icon | Status | Meaning |
|------|--------|---------|
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/pending.svg" width="20"> | **Pending** | Waiting to be processed |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/processing.svg" width="20"> | **Processing** | Currently being processed by Gemini |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/success.svg" width="20"> | **Processed** | Answer generated and filled in successfully |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/failure.svg" width="20"> | **Failed** | Could not generate an answer after all retry attempts |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/skipped.svg" width="20"> | **Skipped** | Question was intentionally skipped |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/prefilled.svg" width="20"> | **Prefilled** | Question already contains an answer |

Questions are skipped in three cases:
- The question is **personal** (name, email, opinion, personal experience) — Gemini cannot answer on your behalf
- The question is a **file upload** — not supported by the extension
- The question **already contains an answer** — in this case, you will have the possibility to manually process this question using a dedicated button

---

## Rate limits

If you hit the Gemini API rate limit during processing, a banner will appear with a countdown timer. Once the timer expires, click **Retry** to resume from where it stopped.

If your daily or monthly quota is exhausted, all remaining questions will be marked as failed and you will be notified with an alert.

---

## Supported question types

| Type | Support |
|------|---------|
| Short answer | ✅ |
| Paragraph | ✅ |
| Multiple choice | ✅ |
| Checkboxes | ✅ |
| Dropdown | ✅ |
| Linear scale | ✅ |
| Rating | ✅ |
| Radio grid (multiple choice grid) | ✅ |
| Checkbox grid | ✅ |
| Date | ✅ |
| Time | ✅ |
| File upload | ⏭ Skipped automatically |

---

## Important notes

- **AI is not perfect.** Gemini may provide incorrect, outdated, or fabricated answers. Treat every filled answer as a suggestion, not a fact
- **Personal questions are skipped.** If Gemini determines that a question requires personal information (your name, preferences, experience, etc.), it will skip it rather than invent an answer
- **Answer language.** The extension instructs Gemini to respond in the same language the question is written in
- **The extension only works** on pages matching `https://docs.google.com/forms/*`

---

## Locales

This extension is available in multiple languages via Chrome's built-in `i18n` API. Currently supported: English, Ukrainian.

You can and are welcome to translate this extension to the language of your choice, if it is not yet supported. To do this:
1. [Fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo) this repository
2. Create a copy of the [English version folder](_locales/en/) inside the [_locales](_locales/) folder
3. Rename it to the appropriate code from [Chrome's list of supported locales](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales) — use an underscore, not a hyphen, for regional variants (e.g. `uk_UA`, not `uk-UA`), or just ignore regional variants completely (e.g. just `uk` instead of `uk_UA`)
4. Open the [messages file](_locales/en/messages.json) of the newly created folder
5. Translate the contents of all **message** keys (**DO NOT** edit **ANYTHING** else, including placeholders)
6. Update the languages list above
7. Open a [pull request](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork) and wait for review

We are grateful for your contributions to the open-source community

---

## License

MIT