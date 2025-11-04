CLIP Embeddings on Google Cloud Run (CPU on request)

Summary

- Deploy a CPU‑only OpenCLIP (ViT‑B/32 → 512‑dim) embeddings service to Cloud Run with min_instances=1 and CPU on request for fast responses without paying for idle CPU.
- App integration via env: IMAGE_EMBEDDINGS_PROVIDER=clip, CLIP_EMBEDDINGS_URL, CLIP_EMBEDDINGS_API_KEY.

Prereqs

- gcloud installed and authenticated: gcloud auth login
- Project selected: gcloud config set project YOUR_PROJECT_ID
- Region set (example): gcloud config set run/region us-central1

Enable services

- gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

Create Artifact Registry repo (once)

- gcloud artifacts repositories create clip \
  --repository-format=docker \
  --location=us-central1 \
  --description="CLIP embeddings"

Build and push container (from repo root)

- gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$PROJECT_ID/clip/clip-embed:latest \
  infra/clip-embed-service

Deploy to Cloud Run

- SECRET=$(openssl rand -hex 24)
- gcloud run deploy clip-embeddings \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/clip/clip-embed:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --concurrency 10 \
  --memory 2Gi \
  --cpu 1 \
  --set-env-vars CLIP_API_KEY=$SECRET

Fetch service URL

- URL=$(gcloud run services describe clip-embeddings --region us-central1 --format='value(status.url)')
- echo $URL

App configuration (.env.local)

- IMAGE_EMBEDDINGS_PROVIDER=clip
- CLIP_EMBEDDINGS_URL=$URL/embed
- CLIP_EMBEDDINGS_API_KEY=$SECRET

Test

- curl -X POST "$URL/embed" \
  -H "Authorization: Bearer $SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"image_url":"https://res.cloudinary.com/demo/image/upload/sample.jpg"}'

Notes

- Model: ViT‑B/32 emits 512‑dim vectors, matching the DB schema (book_image_embeddings_clip).
- CPU on request: you pay for memory while warm (min_instances=1) and CPU only during requests.
