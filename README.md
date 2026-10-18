# Gather

An AI that settles a group trip from its chat history.

Group trips end in awkward money talk. Gather reads an exported group chat, finds every expense, works out who owes whom, and tells everyone the fewest payments needed to settle up.

## How it works

1. **Extract:** Gemini reads each chat message and returns the payer, amount, and who the cost is split between, as structured JSON.
2. **Settle:** Gather nets each person's balance and computes the minimum set of transfers.
3. **Summarize:** a short settlement report shows who pays whom.

## Sample

See [`sample-chat.txt`](sample-chat.txt) for a made-up 4-person trip, and [`expected-result.md`](expected-result.md) for the hand-calculated answer.

## Run it

Set a `GEMINI_API_KEY` environment variable, run `npm install @google/genai`, then run `node gather.js`.

## Status

- [x] Test data and expected result
- [x] Gemini expense extraction
- [x] Settlement algorithm
- [ ] Web page and PDF export
