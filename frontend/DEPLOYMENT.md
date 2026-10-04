# Nuevion Demo Deployment

## Local test

1. Install Node.js LTS: https://nodejs.org/
2. Extract this ZIP.
3. Open a terminal in the `frontend` folder.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open the local URL shown by Vite (usually http://localhost:5173).

## Vercel

- Repository: `shlok-ac/nuevion`
- Branch: `demovideo/integration`
- Root Directory: `frontend`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Environment variables: none required for the core demo

`vercel.json` is included for React Router SPA fallback.

## BHASHINI

The Voice Triage page displays a notice that BHASHINI is not deployed in this public demo. The full BHASHINI/backend integration can be deployed separately later.
