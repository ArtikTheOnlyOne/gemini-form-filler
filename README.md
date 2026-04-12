# Gemini Form Filler

A browser extension for Chromium-based browsers (Chrome, Edge, Brave, Opera) that automatically fills Google Forms using the Google Gemini AI.

> **Disclaimer:** This extension uses an AI model to generate answers. AI makes mistakes — answers may be incorrect, incomplete, or inappropriate. Always review filled answers before submitting. The author takes no responsibility for the results of form submissions made using this extension.

---

## Installation

1. Download or clone this repository
2. Open your browser and navigate to the extensions page:
   - Chrome / Brave / Opera: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode** (toggle in the top right corner)
4. Click **Load unpacked** and select the repository folder
5. The extension icon will appear in your browser toolbar

---

## Setup

Before using the extension, you need a Google Gemini API key.

**Getting an API key:**
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API key** and create a new key

**Configuring the extension:**
1. Click the extension icon in the toolbar to open the popup
2. Paste your API key into the input field
3. Click **Load models**
4. If the key is valid, a dropdown will appear with available models
5. Select the model you want to use for solving forms
6. Your settings are saved automatically

The model list is refreshed every time you open the popup. If a previously selected model becomes unavailable, you will be prompted to choose a new one.

---

## Usage

1. Open any Google Form in your browser
2. A **Solve** button will appear at the top of the form
3. Click **Solve** — the extension will process each question one by one
4. Each question gets a status icon showing the result (see below)
5. Review all filled answers before submitting the form

**Re-running:** Clicking **Solve** again will only process questions marked as failed. Already solved and skipped questions will not be re-processed.

---

## Status icons

| Icon | Status | Meaning |
|------|--------|---------|
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/pending.svg" width="20"> | **Pending** | Waiting to be processed |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/solving.svg" width="20"> | **Solving** | Currently being processed by Gemini |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/success.svg" width="20"> | **Solved** | Answer generated and filled in successfully |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/failure.svg" width="20"> | **Failed** | Could not generate an answer after all retry attempts |
| <img src="https://raw.githubusercontent.com/ArtikTheOnlyOne/gemini-form-filler/main/states/skipped.svg" width="20"> | **Skipped** | Question was intentionally skipped |

Questions are skipped in two cases:
- The question is **personal** (name, email, opinion, personal experience) — Gemini cannot answer on your behalf
- The question is a **file upload** — not supported by the extension

---

## Rate limits

If you hit the Gemini API rate limit during solving, a banner will appear with a countdown timer. Once the timer expires, click **Retry** to resume from where it stopped.

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

## License

MIT