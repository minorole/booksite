import os
import io
import math
import time
from typing import List, Optional

import requests
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, HttpUrl
from PIL import Image

import torch
import open_clip


MODEL_NAME = os.getenv("CLIP_MODEL", "ViT-B-32")
PRETRAINED = os.getenv("CLIP_PRETRAINED", "openai")
TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "10"))
API_KEY = os.getenv("CLIP_API_KEY", "").strip()

app = FastAPI(title="CLIP Embeddings Service", version="1.0.0")


class EmbedRequest(BaseModel):
    image_url: HttpUrl


class EmbedResponse(BaseModel):
    embedding: List[float]


def _auth_ok(req: Request) -> bool:
    if not API_KEY:
        return True
    auth = req.headers.get("authorization") or req.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return False
    token = auth.split(" ", 1)[1].strip()
    return token == API_KEY


@app.on_event("startup")
def load_model():
    # Load OpenCLIP model and transforms once
    global _model, _preprocess
    model, _, preprocess = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=PRETRAINED, device="cpu")
    model.eval()
    _model = model
    _preprocess = preprocess


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "pretrained": PRETRAINED}


def _fetch_image(url: str) -> Image.Image:
    try:
        rsp = requests.get(url, timeout=TIMEOUT_SECONDS)
        if rsp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"image fetch failed: {rsp.status_code}")
        buf = io.BytesIO(rsp.content)
        img = Image.open(buf).convert("RGB")
        return img
    except requests.Timeout:
        raise HTTPException(status_code=408, detail="image fetch timeout")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"image fetch error: {e}")


def _encode_image(img: Image.Image) -> List[float]:
    # Preprocess and encode with CLIP; normalize to unit vector
    with torch.no_grad():
        t = _preprocess(img).unsqueeze(0)
        feats = _model.encode_image(t)
        feats = feats / feats.norm(dim=-1, keepdim=True).clamp(min=1e-12)
        vec = feats[0].cpu().float().tolist()
        return vec


@app.post("/embed", response_model=EmbedResponse)
def embed(req: Request, body: EmbedRequest):
    if not _auth_ok(req):
        raise HTTPException(status_code=401, detail="unauthorized")
    img = _fetch_image(str(body.image_url))
    vec = _encode_image(img)
    # Ensure 512-dim output as expected by the app migrations
    if len(vec) != 512:
        raise HTTPException(status_code=500, detail=f"unexpected embedding dim: {len(vec)} (expected 512)")
    return {"embedding": vec}

