# -*- coding: utf-8 -*-
"""
HilmanAI-7B — Kişisel model sunucusu (HF Space / Docker).
GGUF modeli indirir, OpenAI uyumlu /v1 API açar. HilmanAI sitesi buraya bağlanır.
"""
import os
import time
import uuid
import urllib.request
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

MODEL_URL = os.environ.get(
    "MODEL_URL",
    "https://huggingface.co/HilmanBey/HilmanAI-V1-Beta-Zirve-GGUF/resolve/main/deepseek-r1-distill-qwen-7b.Q4_K_M.gguf",
)
MODEL_PATH = os.environ.get("MODEL_PATH", "/tmp/hilmanai-7b.gguf")
N_CTX = int(os.environ.get("N_CTX", "4096"))
N_THREADS = int(os.environ.get("N_THREADS", "4"))

app = FastAPI(title="HilmanAI-7B")
llm = None


def ensure_model():
    if not os.path.exists(MODEL_PATH):
        print(f"[hilman] model indiriliyor: {MODEL_URL}", flush=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("[hilman] model hazır", flush=True)


@app.on_event("startup")
def startup():
    global llm
    ensure_model()
    from llama_cpp import Llama

    llm = Llama(model_path=MODEL_PATH, n_ctx=N_CTX, n_threads=N_THREADS, verbose=False)
    print("[hilman] motor hazır", flush=True)


@app.get("/health")
def health():
    return {"ok": True, "ready": llm is not None}


@app.get("/v1/models")
def models():
    return {"object": "list", "data": [{"id": "hilmanai-7b", "object": "model"}]}


@app.post("/v1/chat/completions")
async def chat(req: Request):
    body = await req.json()
    messages = body.get("messages", [])
    temperature = float(body.get("temperature", 0.7))
    max_tokens = int(body.get("max_tokens", 768))
    out = llm.create_chat_completion(
        messages=messages, temperature=temperature, max_tokens=max_tokens
    )
    msg = out["choices"][0]["message"]
    content = msg.get("content") or ""
    # R1-distill düşünce bloklarını temizle
    if "<think>" in content and "</think>" in content:
        content = content.split("</think>")[-1].strip()
    return {
        "id": f"hilman-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "hilmanai-7b",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
    }
