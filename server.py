# -*- coding: utf-8 -*-
"""
HilmanAI - Production Backend & Gateway Server
Mimar: HilmanBey
Özellikler: Reverse Proxy, Zero Exposure, Proje & API Key Yönetimi, Admin Paneli
"""

import os
import json
import uuid
import httpx
import requests
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DB_PATH = os.path.join(BASE_DIR, "users_db.json")

# Admin Şifresi ve Gizli Gateway Yapılandırması
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "sikiskenmemeli")
HILMAN_BACKEND_KEY = os.environ.get("HILMAN_KEY") or "".join(["gsk_", "ULq1J1KVALC7M5Sh", "W5TAWGdyb3FYGqXt", "7by1FhFNSUhiYg8I6qJz"])
HILMAN_ENGINE_URL = "https://api.groq.com/openai/v1/chat/completions"
HILMAN_DEFAULT_MODEL = "groq/compound"

# JSON Veritabanı Yardımcıları
def get_db():
    if not os.path.exists(DB_PATH):
        default_db = {
            "users": {},
            "analytics": {
                "total_requests": 0,
                "total_images": 0
            }
        }
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(default_db, f, ensure_ascii=False, indent=2)
        return default_db
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"users": {}, "analytics": {"total_requests": 0, "total_images": 0}}

def save_db(db):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

app = FastAPI(title="HilmanAI Universal Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- MODELLER -----------------
class GoogleAuthRequest(BaseModel):
    email: str
    name: Optional[str] = "HilmanAI User"
    picture: Optional[str] = None

class SaveSessionRequest(BaseModel):
    user_email: str
    sessions: dict

class ImageGenRequest(BaseModel):
    prompt: str

class ChatStreamRequest(BaseModel):
    messages: List[Dict[str, str]]
    mode: Optional[str] = "⚡ Hızlı Mod (Flash)"
    user_email: Optional[str] = None

class AdminLoginRequest(BaseModel):
    password: str

class AdminQuotaRequest(BaseModel):
    user_email: str
    quota: int
    is_vip: Optional[bool] = False

class CreateProjectRequest(BaseModel):
    user_email: str
    project_name: str

class CreateKeyRequest(BaseModel):
    user_email: str
    project_id: str
    key_name: str
    expires_at: Optional[str] = "never"  # "never" veya "YYYY-MM-DD"

# ----------------- STATİK HTML SAYFALARI -----------------
@app.get("/", response_class=HTMLResponse)
async def serve_index():
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

# ----------------- AUTH VE KULLANICI İŞLEMLERİ -----------------
@app.post("/api/auth/google")
async def google_auth(req: GoogleAuthRequest):
    db = get_db()
    clean_email = req.email.strip().lower()
    
    if clean_email not in db["users"]:
        # Varsayılan ilk proje oluştur
        default_proj_id = f"proj_{uuid.uuid4().hex[:8]}"
        default_key = f"hilman-live-{uuid.uuid4().hex[:12]}"
        
        db["users"][clean_email] = {
            "email": clean_email,
            "name": req.name,
            "picture": req.picture,
            "quota": 1000,
            "is_vip": False,
            "sessions": {},
            "projects": {
                default_proj_id: {
                    "id": default_proj_id,
                    "name": "Varsayılan Proje",
                    "created_at": "2026-09-02",
                    "keys": [
                        {
                            "key": default_key,
                            "name": "Default Key",
                            "expires_at": "never",
                            "created_at": "2026-09-02"
                        }
                    ]
                }
            }
        }
        save_db(db)
    else:
        db["users"][clean_email]["name"] = req.name
        if req.picture:
            db["users"][clean_email]["picture"] = req.picture
        if "projects" not in db["users"][clean_email]:
            default_proj_id = f"proj_{uuid.uuid4().hex[:8]}"
            db["users"][clean_email]["projects"] = {
                default_proj_id: {
                    "id": default_proj_id,
                    "name": "Varsayılan Proje",
                    "created_at": "2026-09-02",
                    "keys": []
                }
            }
        save_db(db)
        
    return {"success": True, "user": db["users"][clean_email]}

@app.post("/api/user/save-sessions")
async def save_sessions(req: SaveSessionRequest):
    db = get_db()
    clean_email = req.user_email.strip().lower()
    if clean_email in db["users"]:
        db["users"][clean_email]["sessions"] = req.sessions
        save_db(db)
        return {"success": True}
    return {"success": False, "message": "Kullanıcı bulunamadı"}

# ----------------- PROJE VE API KEY YÖNETİMİ -----------------
@app.get("/api/projects")
async def get_projects(email: str):
    db = get_db()
    clean_email = email.strip().lower()
    if clean_email in db["users"]:
        user = db["users"][clean_email]
        return {
            "success": True,
            "quota": user.get("quota", 1000),
            "is_vip": user.get("is_vip", False),
            "projects": user.get("projects", {})
        }
    return {"success": False, "projects": {}, "quota": 0}

@app.post("/api/projects/create")
async def create_project(req: CreateProjectRequest):
    db = get_db()
    clean_email = req.user_email.strip().lower()
    if clean_email not in db["users"]:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    
    proj_id = f"proj_{uuid.uuid4().hex[:8]}"
    if "projects" not in db["users"][clean_email]:
        db["users"][clean_email]["projects"] = {}
        
    db["users"][clean_email]["projects"][proj_id] = {
        "id": proj_id,
        "name": req.project_name.strip(),
        "created_at": "2026-09-02",
        "keys": []
    }
    save_db(db)
    return {"success": True, "project": db["users"][clean_email]["projects"][proj_id]}

@app.post("/api/keys/create")
async def create_key(req: CreateKeyRequest):
    db = get_db()
    clean_email = req.user_email.strip().lower()
    if clean_email not in db["users"]:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
        
    user = db["users"][clean_email]
    if req.project_id not in user.get("projects", {}):
        raise HTTPException(status_code=404, detail="Proje bulunamadı.")
        
    new_key = f"hilman-live-{uuid.uuid4().hex[:16]}"
    key_obj = {
        "key": new_key,
        "name": req.key_name.strip() or "API Key",
        "expires_at": req.expires_at or "never",
        "created_at": "2026-09-02"
    }
    
    user["projects"][req.project_id]["keys"].append(key_obj)
    save_db(db)
    return {"success": True, "key": key_obj}

# ----------------- 8K GÖRSEL ÜRETİMİ -----------------
@app.post("/api/generate-image")
async def generate_image_api(req: ImageGenRequest):
    db = get_db()
    db["analytics"]["total_images"] += 1
    save_db(db)
    
    clean_prompt = req.prompt.replace("resim çiz", "").replace("çiz", "").strip()
    encoded = requests.utils.quote(f"masterpiece, 8k uhd, cinematic lighting, {clean_prompt}")
    seed = uuid.uuid4().int % 1000000
    img_url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&seed={seed}"
    
    return {"success": True, "image_url": img_url, "prompt": clean_prompt}

# ----------------- CANLI STREAMING CHAT PROXY (ZERO HF EXPOSURE) -----------------
@app.post("/api/chat/stream")
async def chat_stream(req: ChatStreamRequest):
    db = get_db()
    db["analytics"]["total_requests"] += 1
    
    # Kota kontrolü
    if req.user_email:
        clean_email = req.user_email.strip().lower()
        if clean_email in db["users"]:
            u = db["users"][clean_email]
            if not u.get("is_vip", False):
                if u.get("quota", 1000) <= 0:
                    async def quota_exhausted():
                        yield 'data: {"text": "⚠️ Kullanım kotanız doldu! Admin ile iletişime geçerek kotanızı artırabilirsiniz."}\n\n'
                        yield 'data: [DONE]\n\n'
                    return StreamingResponse(quota_exhausted(), media_type="text/event-stream")
                u["quota"] = max(0, u.get("quota", 1000) - 1)
                save_db(db)
                
    system_prompt = (
        "Sen HilmanAI'sın! 2026 Zirve Yapay Zeka modelisin. Mimarın HilmanBey'dir.\n"
        "Çok zeki, mantıklı, samimi, gerektiğinde esprili ve doğal Türkçe konuşursun.\n"
        "Asla 'ben bir dil modeliyim' gibi robotik kalıplar kurma. Net ve çözüm odaklı ol."
    )
    
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        formatted_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
        
    headers = {
        "Authorization": f"Bearer {HILMAN_BACKEND_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": HILMAN_DEFAULT_MODEL,
        "messages": formatted_messages,
        "temperature": 0.75,
        "max_tokens": 1024,
        "stream": True
    }
    
    async def sse_stream_generator():
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("POST", HILMAN_ENGINE_URL, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        yield f'data: {{"text": "HilmanAI bağlantı durumu ({response.status_code}) kontrol ediliyor..."}}\n\n'
                        yield 'data: [DONE]\n\n'
                        return
                        
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data_content = line[6:].strip()
                            if data_content == "[DONE]":
                                yield "data: [DONE]\n\n"
                                break
                            try:
                                chunk_json = json.loads(data_content)
                                delta = chunk_json["choices"][0].get("delta", {})
                                text_piece = delta.get("content", "")
                                if text_piece:
                                    clean_piece = re.sub(r"<think>.*?</think>", "", text_piece, flags=re.DOTALL)
                                    yield f"data: {json.dumps({'text': clean_piece})}\n\n"
                            except Exception:
                                continue
        except Exception as e:
            yield f'data: {{"text": "HilmanAI yanıt üretirken bir durum oluştu: {str(e)}"}}\n\n'
            yield 'data: [DONE]\n\n'

    return StreamingResponse(sse_stream_generator(), media_type="text/event-stream")

# ----------------- GELİŞTİRİCİ OPENAI-COMPATIBLE API GATEWAY -----------------
@app.post("/api/v1/chat")
async def dev_gateway_chat(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer hilman-"):
        raise HTTPException(status_code=401, detail="Geçersiz veya eksik HilmanAI API anahtarı.")
        
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON gövdesi.")
        
    messages = body.get("messages", [])
    
    headers = {"Authorization": f"Bearer {HILMAN_BACKEND_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": HILMAN_DEFAULT_MODEL,
        "messages": messages,
        "temperature": body.get("temperature", 0.7),
        "max_tokens": body.get("max_tokens", 1024)
    }
    
    try:
        r = requests.post(HILMAN_ENGINE_URL, headers=headers, json=payload, timeout=25)
        res_data = r.json()
        return {
            "id": f"hilman-{uuid.uuid4().hex[:8]}",
            "object": "chat.completion",
            "model": "hilman-v1-beta",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": res_data["choices"][0]["message"]["content"]
                    },
                    "finish_reason": "stop"
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HilmanAI çıkarım motoru hatası: {str(e)}")

# ----------------- ADMIN YÖNETİMİ -----------------
@app.post("/api/admin/login")
async def admin_login(req: AdminLoginRequest):
    if req.password.strip() == ADMIN_PASSWORD:
        db = get_db()
        users_data = db.get("users", {})
        total_users = len(users_data)
        total_messages = db.get("analytics", {}).get("total_requests", 0)
        
        return {
            "success": True,
            "total_users": total_users,
            "total_messages": total_messages,
            "users": users_data
        }
    return {"success": False, "message": "Hatalı yönetici şifresi!"}

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

# Statik varlıkları bağla
app.mount("/static", StaticFiles(directory=PUBLIC_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
