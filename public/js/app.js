// HilmanAI Client Application Engine - Zero HF Exposure
let currentUser = null;
let currentChatHistory = [];
let allSessions = {};
let activeSessionTitle = null;
let tokenClient = null;

const GOOGLE_CLIENT_ID = "650871021061-iafca75rf9ea60vi41e4vj61jij0no0k.apps.googleusercontent.com";

// 1. Google OAuth Token Client Initialization
function initGoogleAuth() {
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
                        console.error("Google Auth error:", e);
                        alert("Google girişi sırasında bir hata oluştu.");
                    }
                }
            },
        });
    }
}

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
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'select_account' });
    } else {
        setTimeout(() => {
            initGoogleAuth();
            if (tokenClient) tokenClient.requestAccessToken({ prompt: 'select_account' });
        }, 500);
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
    
    // Append User Message
    appendMessage('user', text);
    currentChatHistory.push({ role: 'user', content: text });

    const mode = document.getElementById('mode-selector').value;

    // 1. Check for Image Generation Request
    const lower = text.toLowerCase();
    const isImageReq = lower.startsWith('resim') || lower.startsWith('çiz') || lower.includes('resim çiz') || lower.includes('görsel yap');
    
    if (isImageReq) {
        const assistantEl = appendMessage('assistant', '<div class="pulse-text">⚡ 8K Ultra HD Görsel Üretiliyor...</div>');
        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });
            const data = await res.json();
            if (data.success) {
                const cardHtml = `
                    <div style="background: rgba(18, 20, 24, 0.85); border: 1px solid rgba(0, 242, 254, 0.4); border-radius: 18px; padding: 14px; margin-top: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                            <span style="background: linear-gradient(135deg, #00f2fe, #4facfe); color: #000; font-weight: 800; font-size: 0.72rem; padding: 2px 8px; border-radius: 6px;">8K UHD</span>
                            <span style="color: #fff; font-size: 0.88rem; font-weight: 700;">HilmanAI 8K Görsel Motoru</span>
                        </div>
                        <img src="${data.image_url}" style="width: 100%; max-height: 480px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(0, 242, 254, 0.2); margin-bottom: 8px;" alt="Üretilen Görsel"/>
                        <div style="font-size: 0.82rem; color: #8e918f;">Prompt: <i>${data.prompt}</i></div>
                    </div>
                `;
                assistantEl.querySelector('.message-bubble').innerHTML = cardHtml;
                currentChatHistory.push({ role: 'assistant', content: cardHtml });
                saveCurrentSession();
            }
        } catch(e) {
            assistantEl.querySelector('.message-bubble').innerText = "Görsel üretilirken bir sorun oluştu.";
        }
        return;
    }

    // 2. Text Stream Inference
    const assistantEl = appendMessage('assistant', '<div class="pulse-text">⚡ HilmanAI düşünüyor...</div>');
    const bubble = assistantEl.querySelector('.message-bubble');

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
        const decoder = new TextDecoder();
        let fullText = '';
        bubble.innerHTML = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.text) {
                            fullText += parsed.text;
                            bubble.innerHTML = marked.parse(fullText);
                            // Highlight code blocks
                            bubble.querySelectorAll('pre code').forEach((block) => {
                                hljs.highlightElement(block);
                            });
                        }
                    } catch(err) {}
                }
            }
            scrollToBottom();
        }

        currentChatHistory.push({ role: 'assistant', content: fullText });
        saveCurrentSession();

    } catch(e) {
        bubble.innerText = "HilmanAI yanıt verirken bir bağlantı sorunu yaşandı.";
    }
}

function appendMessage(role, contentHtml) {
    const chat = document.getElementById('chat-messages');
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    
    if (role === 'assistant') {
        row.innerHTML = `
            <img src="/static/logo.png" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; align-self: flex-start;" alt="HilmanAI">
            <div class="message-bubble">${contentHtml}</div>
        `;
    } else {
        row.innerHTML = `<div class="message-bubble">${contentHtml}</div>`;
    }

    chat.appendChild(row);
    scrollToBottom();
    return row;
}

function scrollToBottom() {
    const chat = document.getElementById('chat-messages');
    chat.scrollTop = chat.scrollHeight;
}

function startNewChat() {
    currentChatHistory = [];
    activeSessionTitle = null;
    const chat = document.getElementById('chat-messages');
    chat.innerHTML = `
        <div class="message-row assistant">
            <img src="/static/logo.png" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; align-self: flex-start;" alt="HilmanAI">
            <div class="message-bubble">
                Yeni sohbet başlatıldı! Size nasıl yardımcı olabilirim?
            </div>
        </div>
    `;
}

function saveCurrentSession() {
    if (!currentChatHistory || currentChatHistory.length === 0) return;
    
    if (!activeSessionTitle) {
        const firstUserMsg = currentChatHistory.find(m => m.role === 'user');
        const snippet = firstUserMsg ? firstUserMsg.content.slice(0, 24) : 'Sohbet';
        activeSessionTitle = `💬 ${snippet}...`;
    }

    allSessions[activeSessionTitle] = [...currentChatHistory];
    renderHistoryUI();

    if (currentUser && currentUser.email) {
        fetch('/api/user/save-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: currentUser.email,
                sessions: allSessions
            })
        });
    }
}

function renderHistoryUI() {
    const list = document.getElementById('history-list');
    const keys = Object.keys(allSessions);
    
    if (keys.length === 0) {
        list.innerHTML = `<div style="font-size: 0.8rem; color: #7d8590; padding: 12px; text-align: center; border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px;">💬 Henüz sohbet geçmişi yok</div>`;
        return;
    }

    list.innerHTML = '';
    keys.reverse().forEach(title => {
        const item = document.createElement('div');
        item.className = `history-item ${title === activeSessionTitle ? 'active' : ''}`;
        item.innerText = title;
        item.onclick = () => loadSession(title);
        list.appendChild(item);
    });
}

function loadSession(title) {
    if (!allSessions[title]) return;
    activeSessionTitle = title;
    currentChatHistory = [...allSessions[title]];
    
    const chat = document.getElementById('chat-messages');
    chat.innerHTML = '';
    
    currentChatHistory.forEach(m => {
        appendMessage(m.role, m.content.startsWith('<div') ? m.content : marked.parse(m.content));
    });
    
    renderHistoryUI();
}

// Auto Login check
window.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth();
    const saved = localStorage.getItem('hilman_user');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            updateProfileUI();
            allSessions = currentUser.sessions || {};
            renderHistoryUI();
            document.getElementById('auth-overlay').style.display = 'none';
        } catch(e) {}
    }
});
