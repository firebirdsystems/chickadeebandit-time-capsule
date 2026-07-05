# Time Capsule

Seal family letters, predictions, memories, and attachment references until a shared reveal date. Adults create, close, reveal, and archive capsules; every member can add entries while a capsule is open.

## Quick start

```bash
npm run dev
npm run build
npm test
```

The app is based on `chickadeebandit-apps/app-template` and builds to `dist/bundle.json` for hub installation.

## Data model

- `capsules`: adult-managed sessions with `open`, `closed`, `revealed`, and `archived` states.
- `entries`: member-authored letters and predictions, hidden behind `sealed_until` until reveal.
- `attachments`: file metadata linked to entries and governed by inherited visibility.
