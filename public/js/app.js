// HilmanAI Client Application Engine - Universal Edition
let currentUser = null;
let currentChatHistory = [];
let allSessions = {};
let activeSessionTitle = null;
let tokenClient = null;

const GOOGLE_CLIENT_ID = "650871021061-iafca75rf9ea60vi41e4vj61jij0no0k.apps.googleusercontent.com";

// 1. Google OAuth Initialization
function initGoogleAuth() {
    try {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        try {
                            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { 'Authorization': 'Bearer ' + tokenResponse.access_token }
                            });
                            const googleUser = await res.json();
                            await handleServerLogin(googleUser);
                        } catch(e) {
                            console.error("Google Auth userinfo error:", e);
                            fallbackDirectLogin();
                        }
                    } else if (tokenResponse && tokenResponse.error) {
                        console.warn("Token response error:", tokenResponse.error);
                        fallbackDirectLogin();
                    }
                },
                error_callback: (err) => {
                    console.warn("Google OAuth error_callback:", err);
                    fallbackDirectLogin();
                }
            });
        }
    } catch(e) {
        console.warn("Google OAuth init error:", e);
    }
}

// JWT Token Decoder helper for Credential response
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch(e) {
        return null;
    }
}

// Google OneTap / Button Credential Callback
window.handleCredentialResponse = async function(response) {
    if (response && response.credential) {
        const payload = parseJwt(response.credential);
        if (payload) {
            await handleServerLogin({
                email: payload.email,
                name: payload.name || payload.given_name,
                picture: payload.picture
            });
        }
    }
};

function loginWithGoogle() {
    const agree = document.getElementById('terms-agree');
    const warning = document.getElementById('terms-warning');
    if (agree && !agree.checked) {
        if (warning) warning.style.display = 'block';
        return;
    }
    if (warning) warning.style.display = 'none';

    if (!tokenClient) {
        initGoogleAuth();
    }

    let authTriggered = false;
    if (tokenClient) {
        try {
            tokenClient.requestAccessToken({ prompt: 'select_account' });
            authTriggered = true;
        } catch(e) {
            console.warn("tokenClient request failed:", e);
        }
    }

    if (!authTriggered) {
        setTimeout(() => {
            initGoogleAuth();
            if (tokenClient) {
                try {
                    tokenClient.requestAccessToken({ prompt: 'select_account' });
                } catch(e) {
                    fallbackDirectLogin();
                }
            } else {
                fallbackDirectLogin();
            }
        }, 500);
    }
}

function fallbackDirectLogin() {
    const email = prompt("Google hesabı ile devam edin (E-posta adresinizi girin):");
    if (email && email.includes("@")) {
        const clean = email.trim().toLowerCase();
        handleServerLogin({
            email: clean,
            name: clean.split('@')[0],
            picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${clean}`
        });
    }
}

async function handleServerLogin(googleUser) {
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: googleUser.email,
                name: googleUser.name,
                picture: googleUser.picture
            })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('hilman_user', JSON.stringify(currentUser));
            updateProfileUI();
            
            // Load sessions
            allSessions = currentUser.sessions || {};
            renderHistoryUI();

            // Hide auth overlay
            document.getElementById('auth-overlay').style.display = 'none';
        }
    } catch(e) {
        console.error("Server sync error:", e);
        // Local offline session fallback
        currentUser = {
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            quota: 1000,
            sessions: {}
        };
        localStorage.setItem('hilman_user', JSON.stringify(currentUser));
        updateProfileUI();
        document.getElementById('auth-overlay').style.display = 'none';
    }
}

function updateProfileUI() {
    if (currentUser) {
        document.getElementById('user-avatar').src = currentUser.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.email}`;
        document.getElementById('user-name').innerText = currentUser.name || currentUser.email.split('@')[0];
        document.getElementById('user-email').innerText = currentUser.email;
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('hilman_user');
    document.getElementById('auth-overlay').style.display = 'flex';
}

// 2. Chat & Message Logic
function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto';

    // Check if session exists
    if (!activeSessionTitle) {
        activeSessionTitle = text.slice(0, 24) + (text.length > 24 ? "..." : "");
        allSessions[activeSessionTitle] = [];
    }

    // Append user message
    appendMessage('user', text);
    currentChatHistory.push({ role: 'user', content: text });
    allSessions[activeSessionTitle].push({ role: 'user', content: text });

    // 1. Image generation command
    const lowText = text.toLowerCase();
    if (lowText.startsWith("resim çiz") || lowText.startsWith("çiz") || lowText.includes("resmini yap") || lowText.includes("görsel oluştur")) {
        await handleImageGeneration(text);
        saveSessionsToServer();
        renderHistoryUI();
        return;
    }

    // 2. Text Stream Inference
    await streamAssistantResponse();
    saveSessionsToServer();
    renderHistoryUI();
}

async function handleImageGeneration(prompt) {
    const chat = document.getElementById('chat-messages');
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.innerHTML = `
        <img src="/static/logo.png" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; align-self: flex-start;" alt="HilmanAI">
        <div class="message-bubble">
            <span class="pulse-badge">🎨 HilmanAI 8K Görsel Motoru Çiziyor...</span>
        </div>
    `;
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;

    try {
        const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });
        const data = await res.json();
        if (data.success) {
            const cardHtml = `
                <div style="background: rgba(18, 20, 24, 0.85); border: 1px solid rgba(0, 242, 254, 0.4); border-radius: 18px; padding: 14px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <span style="background: linear-gradient(135deg, #00f2fe, #4facfe); color: #000; font-weight: 800; font-size: 0.72rem; padding: 2px 8px; border-radius: 6px;">8K UHD</span>
                        <span style="color: #fff; font-size: 0.88rem; font-weight: 700;">HilmanAI Vision 1.0</span>
                    </div>
                    <img src="${data.image_url}" style="width: 100%; max-height: 480px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(0, 242, 254, 0.2); margin-bottom: 10px;" alt="Üretilen Görsel"/>
                    <div style="font-size: 0.82rem; color: #8e918f;">Prompt: <i>${data.prompt}</i></div>
                </div>
            `;
            row.querySelector('.message-bubble').innerHTML = cardHtml;
            currentChatHistory.push({ role: 'assistant', content: cardHtml });
            allSessions[activeSessionTitle].push({ role: 'assistant', content: cardHtml });
        }
    } catch(e) {
        row.querySelector('.message-bubble').innerText = "Görsel oluşturulurken bir hata oluştu.";
    }
}

async function streamAssistantResponse() {
    const chat = document.getElementById('chat-messages');
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = '<span class="pulse-badge">⚡ HilmanAI Çıkarım Yapıyor...</span>';

    row.innerHTML = `<img src="/static/logo.png" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; align-self: flex-start;" alt="HilmanAI">`;
    row.appendChild(bubble);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;

    const mode = document.getElementById('mode-selector').value;
    let fullResponse = "";

    try {
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: currentChatHistory,
                mode: mode,
                user_email: currentUser ? currentUser.email : null
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop(); // Keep last incomplete chunk

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const dataStr = line.replace("data: ", "").trim();
                    if (dataStr === "[DONE]") {
                        break;
                    }
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.text) {
                            fullResponse += parsed.text;
                            bubble.innerHTML = marked.parse(fullResponse);
                            bubble.querySelectorAll('pre code').forEach((block) => {
                                hljs.highlightElement(block);
                            });
                            chat.scrollTop = chat.scrollHeight;
                        }
                    } catch(e) {
                        // ignore malformed chunks
                    }
                }
            }
        }

        currentChatHistory.push({ role: 'assistant', content: fullResponse });
        allSessions[activeSessionTitle].push({ role: 'assistant', content: fullResponse });

    } catch(e) {
        bubble.innerText = "HilmanAI yanıt üretirken bir durum oluştu.";
    }
}

function appendMessage(role, content) {
    const chat = document.getElementById('chat-messages');
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    
    let contentHtml = role === 'assistant' ? marked.parse(content) : escapeHtml(content);
    
    if (role === 'assistant') {
        row.innerHTML = `
            <img src="/static/logo.png" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; align-self: flex-start;" alt="HilmanAI">
            <div class="message-bubble">${contentHtml}</div>
        `;
    } else {
        row.innerHTML = `
            <div class="message-bubble">${contentHtml}</div>
        `;
    }
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
}

function startNewChat() {
    activeSessionTitle = null;
    currentChatHistory = [];
    const chat = document.getElementById('chat-messages');
    chat.innerHTML = `
        <div class="message-row assistant">
            <img src="/static/logo.png" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; align-self: flex-start;" alt="HilmanAI">
            <div class="message-bubble">
                Yeni sohbet başlatıldı! Size nasıl yardımcı olabilirim?
            </div>
        </div>
    `;
    renderHistoryUI();
}

function renderHistoryUI() {
    const container = document.getElementById('history-list');
    const titles = Object.keys(allSessions);
    
    if (titles.length === 0) {
        container.innerHTML = `<div id="empty-history-msg" style="font-size: 0.8rem; color: #7d8590; padding: 12px; text-align: center; border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px;">💬 Henüz sohbet geçmişi yok</div>`;
        return;
    }

    container.innerHTML = '';
    titles.slice().reverse().forEach(title => {
        const item = document.createElement('div');
        item.className = `history-item ${title === activeSessionTitle ? 'active' : ''}`;
        item.innerHTML = `
            <span style="font-size: 0.85rem;">💬</span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${title}</span>
            <button onclick="deleteSession(event, '${title}')" style="background: none; border: none; color: #8e918f; cursor: pointer; font-size: 0.75rem;">✕</button>
        `;
        item.onclick = () => loadSession(title);
        container.appendChild(item);
    });
}

function loadSession(title) {
    activeSessionTitle = title;
    currentChatHistory = allSessions[title] || [];
    
    const chat = document.getElementById('chat-messages');
    chat.innerHTML = '';

    currentChatHistory.forEach(msg => {
        appendMessage(msg.role, msg.content);
    });

    renderHistoryUI();
}

function deleteSession(e, title) {
    e.stopPropagation();
    delete allSessions[title];
    if (activeSessionTitle === title) {
        startNewChat();
    } else {
        renderHistoryUI();
    }
    saveSessionsToServer();
}

async function saveSessionsToServer() {
    if (currentUser && currentUser.email) {
        try {
            await fetch('/api/user/save-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: currentUser.email,
                    sessions: allSessions
                })
            });
        } catch(e) {}
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

// 3. Init on Window Load
window.addEventListener('DOMContentLoaded', () => {
    // Check local storage for session
    const savedUser = localStorage.getItem('hilman_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateProfileUI();
            allSessions = currentUser.sessions || {};
            renderHistoryUI();
            document.getElementById('auth-overlay').style.display = 'none';
        } catch(e) {}
    }

    initGoogleAuth();
});
