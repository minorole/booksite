CLIP Embeddings Service (CPU) — Cloud Run Ready

Overview
- Minimal FastAPI service that computes 512‑dim image embeddings using OpenCLIP (ViT‑B/32) on CPU.
- Contract: POST /embed { image_url } → { embedding: number[512] }
- Optional Bearer auth via CLIP_API_KEY.

Local run (optional)
- Requirements: Docker Desktop or Python 3.11 + pip + a working C compiler.

Docker:
- docker build -t clip-embed:local .
- docker run -p 8080:8080 -e CLIP_API_KEY=dev-secret clip-embed:local
- curl -X POST 'http://localhost:8080/embed' \
  -H 'Authorization: Bearer dev-secret' -H 'Content-Type: application/json' \
  -d '{"image_url":"https://res.cloudinary.com/demo/image/upload/sample.jpg"}'

Direct Python (not recommended for production):
- pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
- uvicorn app:app --host 0.0.0.0 --port 8080

Deploy to Cloud Run (CPU on request, always warm)
- See doc/admin-ai/clip-deploy-cloudrun.md in the repo root for the full guide.

