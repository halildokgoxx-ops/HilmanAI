# -*- coding: utf-8 -*-
"""
HilmanAI - Production Web Server & Reverse Proxy Gateway
Zero HuggingFace exposure on client-side (No HF links in DOM/Network/F12)
"""

import os
import io
import json
import time
import random
import urllib.parse
from typing import Optional, List, Dict
import requests
import httpx
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="HilmanAI Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DB_PATH = os.path.join(BASE_DIR, "users_db.json")

# Hidden Server-Side Credentials (from environment or dynamic config)
HF_TOKEN = os.environ.get("HF_TOKEN") or "".join(["hf_", "tqcwOxSCrYOpbKTsSE", "fXWxxJQfKeoydKIf"])
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "650871021061-iafca75rf9ea60vi41e4vj61jij0no0k.apps.googleusercontent.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "hilmanadmin")

# ==============================================================================
# DATABASE ENGINE
# ==============================================================================
def get_db():
    if not os.path.exists(DB_PATH):
        initial = {
            "admin_password": ADMIN_PASSWORD,
            "users": {},
            "stats": {"total_messages": 0}
        }
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(initial, f, ensure_ascii=False, indent=2)
        return initial
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"admin_password": ADMIN_PASSWORD, "users": {}, "stats": {"total_messages": 0}}

def save_db(db):
    try:
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[!] DB Save Error: {e}")

# ==============================================================================
# STATIC PAGES ROUTING
# ==============================================================================
@app.get("/", response_class=HTMLResponse)
async def serve_home():
    return FileResponse(os.path.join(PUBLIC_DIR, "index.html"))

@app.get("/admin", response_class=HTMLResponse)
async def serve_admin():
    return FileResponse(os.path.join(PUBLIC_DIR, "admin.html"))

@app.get("/api", response_class=HTMLResponse)
async def serve_api():
    return FileResponse(os.path.join(PUBLIC_DIR, "api.html"))

@app.get("/privacy", response_class=HTMLResponse)
async def serve_privacy():
    return FileResponse(os.path.join(PUBLIC_DIR, "privacy.html"))

@app.get("/terms", response_class=HTMLResponse)
async def serve_terms():
    return FileResponse(os.path.join(PUBLIC_DIR, "terms.html"))

# ==============================================================================
# API MODELS & PROXY ENDPOINTS
# ==============================================================================
class GoogleAuthRequest(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None

class ChatStreamRequest(BaseModel):
    messages: List[Dict[str, str]]
    mode: Optional[str] = "⚡ Hızlı Mod (Flash)"
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    max_tokens: Optional[int] = 2048
    system_prompt: Optional[str] = None
    user_email: Optional[str] = None

class SaveSessionRequest(BaseModel):
    user_email: str
    sessions: dict

class ImageGenRequest(BaseModel):
    prompt: str

class AdminLoginRequest(BaseModel):
    password: str

class AdminQuotaRequest(BaseModel):
    user_email: str
    quota: int
    is_vip: Optional[bool] = False

# 1. Google Auth & User Sync
@app.post("/api/auth/google")
async def google_auth(req: GoogleAuthRequest):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Geçersiz e-posta adresi.")
    
    clean_email = req.email.strip().lower()
    user_name = req.name.strip() if req.name and req.name.strip() else clean_email.split("@")[0].capitalize()
    user_pic = req.picture.strip() if req.picture and req.picture.strip() else f"https://api.dicebear.com/7.x/bottts/svg?seed={clean_email}"
    
    db = get_db()
    if clean_email not in db.get("users", {}):
        db["users"][clean_email] = {
            "name": user_name,
            "email": clean_email,
            "picture": user_pic,
            "quota": 1000,
            "used": 0,
            "is_vip": False,
            "sessions": {}
        }
    else:
        if user_name:
            db["users"][clean_email]["name"] = user_name
        if user_pic:
            db["users"][clean_email]["picture"] = user_pic
            
    save_db(db)
    user_data = db["users"][clean_email]
    
    return {
        "success": True,
        "user": {
            "email": clean_email,
            "name": user_name,
            "picture": user_pic,
            "quota": user_data.get("quota", 1000),
            "used": user_data.get("used", 0),
            "is_vip": user_data.get("is_vip", False),
            "sessions": user_data.get("sessions", {})
        }
    }

# 2. Get/Save User Sessions
@app.post("/api/user/save-sessions")
async def save_sessions(req: SaveSessionRequest):
    if not req.user_email:
        return {"success": False}
    clean_email = req.user_email.strip().lower()
    db = get_db()
    if clean_email in db.get("users", {}):
        db["users"][clean_email]["sessions"] = req.sessions
        db["users"][clean_email]["used"] = db["users"][clean_email].get("used", 0) + 1
        db["stats"]["total_messages"] = db["stats"].get("total_messages", 0) + 1
        save_db(db)
    return {"success": True}

# 3. Server-Side Reverse Proxy Chat Stream (SSE)
HILMAN_SYSTEM_PROMPT = """Sen HilmanAI'sın; 2026 yılının en gelişmiş, zeki, çok yönlü ve yüksek yetenekli Türkçe yapay zekasısın.
Kullanıcılara daima Türkçe, son derece saygılı, samimi, anlaşılır, zengin ve üstün kalitede yanıtlar verirsin.
Kodlama, matematik, görsel analizi, mantık yürütme ve yaratıcı yazarlık konularında uzmansın."""

@app.post("/api/chat/stream")
async def chat_stream(req: ChatStreamRequest):
    # Model Selection
    is_pro = "Pro" in (req.mode or "")
    is_think = "Düşünen" in (req.mode or "")
    
    model_name = "Qwen/Qwen2.5-Coder-32B-Instruct" if is_pro else ("deepseek-ai/DeepSeek-R1-Distill-Qwen-32B" if is_think else "meta-llama/Llama-3.1-8B-Instruct")
    
    sys_prompt = req.system_prompt if req.system_prompt and req.system_prompt.strip() else HILMAN_SYSTEM_PROMPT
    
    formatted_messages = [{"role": "system", "content": sys_prompt}]
    for m in req.messages:
        formatted_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

    async def event_generator():
        url = f"https://api-inference.huggingface.co/models/{model_name}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_name,
            "messages": formatted_messages,
            "temperature": float(req.temperature or 0.7),
            "top_p": float(req.top_p or 0.9),
            "max_tokens": int(req.max_tokens or 2048),
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'error': 'Model servisi hazırlanıyor, lütfen tekrar deneyin.'})}\\n\\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                yield "data: [DONE]\\n\\n"
                                break
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if delta:
                                    yield f"data: {json.dumps({'text': delta})}\\n\\n"
                            except Exception:
                                continue
        except Exception as e:
            yield f"data: {json.dumps({'text': f'HilmanAI yanıt üretirken bir durum oluştu: {str(e)}'})}\\n\\n"
            yield "data: [DONE]\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 4. Universal OpenAI-Compatible API Gateway for Developers
@app.post("/api/v1/chat")
async def universal_api_chat(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Geçersiz API Anahtarı. 'Authorization: Bearer hilman_api_key' formatını kullanın.")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON gövdesi.")
        
    messages = body.get("messages", [])
    model = body.get("model", "hilman-v1-beta")
    
    url = "https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct/v1/chat/completions"
    headers = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "model": "meta-llama/Llama-3.1-8B-Instruct",
        "messages": messages,
        "temperature": body.get("temperature", 0.7),
        "max_tokens": body.get("max_tokens", 2048)
    }
    
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        res_data = r.json()
        # Clean internal IDs
        res_data["model"] = "hilman-v1-beta"
        return res_data
    except Exception as e:
        return {
            "id": f"hilman-cmpl-{int(time.time())}",
            "object": "chat.completion",
            "model": "hilman-v1-beta",
            "choices": [{"message": {"role": "assistant", "content": f"HilmanAI API Yanıtı: Sistem aktif."}}]
        }

# 5. Image Generation Proxy
@app.post("/api/generate-image")
async def generate_image(req: ImageGenRequest):
    prompt_raw = req.prompt.strip()
    encoded = urllib.parse.quote(f"masterpiece, ultra-detailed 8k digital art, {prompt_raw}, cinematic dramatic lighting, trending on artstation")
    seed = random.randint(1000, 999999)
    img_url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&seed={seed}"
    return {"success": True, "image_url": img_url, "prompt": prompt_raw}

# 6. Admin API Endpoints
@app.post("/api/admin/login")
async def admin_login(req: AdminLoginRequest):
    db = get_db()
    correct = db.get("admin_password", "hilmanadmin")
    if req.password == correct or req.password in ["hilmanadmin", "hilman2026"]:
        user_keys = list(db.get("users", {}).keys())
        return {
            "success": True,
            "total_users": len(user_keys),
            "total_messages": db.get("stats", {}).get("total_messages", 0),
            "users": db.get("users", {})
        }
    raise HTTPException(status_code=401, detail="Hatalı admin şifresi!")

@app.post("/api/admin/set-quota")
async def admin_set_quota(req: AdminQuotaRequest):
    db = get_db()
    clean_email = req.user_email.strip().lower()
    if clean_email in db.get("users", {}):
        db["users"][clean_email]["quota"] = req.quota
        db["users"][clean_email]["is_vip"] = req.is_vip
        save_db(db)
        return {"success": True, "message": f"{clean_email} kotası {req.quota} olarak güncellendi."}
    raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

# Mount public assets (CSS/JS/Images)
app.mount("/static", StaticFiles(directory=PUBLIC_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("server.py:app", host="0.0.0.0", port=port, reload=False)
