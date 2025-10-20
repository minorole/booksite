# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- refactor(openai): migrate both text and vision to the Responses API (`client.responses.create`) with a centralized helper that converts chat-style messages (text + images) to Responses input and maps JSON schema output to `text.format`. Eliminates usage of Chat Completions in our wrappers.
- fix(vision): resolve `400 Unsupported parameter: 'max_tokens'` on `gpt-5-mini` by using Responses `max_output_tokens` via the centralized path. Vision tools now return structured JSON without error.
- docs: add this changelog entry.

Impacted files:
- `src/lib/openai/responses.ts`
- `src/lib/openai/vision.ts`
- `src/lib/openai/chat.ts`
