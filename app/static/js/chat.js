let selectedUserId = null;
let socket = null;
let messagePollingInterval = null;
let userRefreshInterval = null;
let knownUsers = [];
let isSending = false;
let isComposing = false;

function getUserId(value) {
    return parseInt(value, 10);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = '/auth';
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
    }
}

function renderUserList() {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';

    const favoriteElement = document.createElement('div');
    favoriteElement.className = 'user-item';
    favoriteElement.setAttribute('data-user-id', currentUserId);
    if (selectedUserId === currentUserId) {
        favoriteElement.classList.add('active');
    }
    favoriteElement.innerHTML = '<span class="user-indicator" aria-hidden="true"></span><span class="user-name">Избранное</span>';
    favoriteElement.addEventListener('click', () => selectUser(currentUserId, 'Избранное'));
    userList.appendChild(favoriteElement);

    knownUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.setAttribute('data-user-id', user.id);

        if (selectedUserId === user.id) {
            userElement.classList.add('active');
        }
        if (user.has_unread) {
            userElement.classList.add('has-unread');
        }

        userElement.innerHTML = `
            <span class="user-indicator" aria-hidden="true"></span>
            <span class="user-name">${escapeHtml(user.name)}</span>
        `;
        userElement.addEventListener('click', () => selectUser(user.id, user.name));
        userList.appendChild(userElement);
    });
}

async function fetchUsers() {
    try {
        const response = await fetch('/auth/users');
        knownUsers = await response.json();

        if (selectedUserId !== null) {
            knownUsers = knownUsers.map(user => (
                user.id === selectedUserId ? { ...user, has_unread: false } : user
            ));
        }

        renderUserList();
    } catch (error) {
        console.error('Ошибка при загрузке списка пользователей:', error);
    }
}

function createMessageElement(text, recipientId) {
    const activeUserId = getUserId(selectedUserId);
    const messageClass = activeUserId === getUserId(recipientId) ? 'my-message' : 'other-message';
    return `<div class="message ${messageClass}">${escapeHtml(text)}</div>`;
}

function renderMessages(messages) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = messages.map(message => (
        createMessageElement(message.content, message.recipient_id)
    )).join('');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadMessages(userId) {
    try {
        const response = await fetch(`/chat/messages/${userId}`);
        const messages = await response.json();
        renderMessages(messages);

        if (userId !== currentUserId) {
            knownUsers = knownUsers.map(user => (
                user.id === userId ? { ...user, has_unread: false } : user
            ));
            renderUserList();
        }
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

function connectWebSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${wsProtocol}://${window.location.host}/chat/ws/${currentUserId}`);

    socket.onmessage = async () => {
        await fetchUsers();
        if (selectedUserId !== null) {
            await loadMessages(selectedUserId);
        }
    };

    socket.onclose = () => {
        socket = null;
    };
}

async function selectUser(userId, userName) {
    selectedUserId = getUserId(userId);
    document.getElementById('chatHeader').innerHTML = `<span>Чат с ${escapeHtml(userName)}</span><button class="logout-button" id="logoutButton">Выход</button>`;
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendButton').disabled = false;
    document.getElementById('messages').style.display = 'block';
    document.getElementById('logoutButton').onclick = logout;

    renderUserList();
    await loadMessages(selectedUserId);
    startMessagePolling(selectedUserId);
}

async function sendMessage() {
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const rawMessage = messageInput.value;
    const message = rawMessage.trim();

    if (!message || selectedUserId === null || isSending) {
        return;
    }

    isSending = true;
    sendButton.disabled = true;
    messageInput.readOnly = true;
    if (messageForm) {
        messageForm.reset();
    }
    messageInput.value = '';
    const payload = { recipient_id: selectedUserId, content: message };

    try {
        const response = await fetch('/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            messageInput.value = rawMessage;
            throw new Error('Не удалось отправить сообщение');
        }

        await loadMessages(selectedUserId);
        await fetchUsers();
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
    } finally {
        isSending = false;
        sendButton.disabled = false;
        messageInput.readOnly = false;
        messageInput.focus();
    }
}

function startMessagePolling(userId) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = setInterval(() => loadMessages(userId), 2000);
}

async function bootstrapChatPage() {
    await fetchUsers();
    clearInterval(userRefreshInterval);
    userRefreshInterval = setInterval(fetchUsers, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    void bootstrapChatPage();
    connectWebSocket();

    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');

    if (messageInput) {
        messageInput.addEventListener('compositionstart', () => {
            isComposing = true;
        });
        messageInput.addEventListener('compositionend', () => {
            isComposing = false;
        });
    }

    if (messageForm) {
        messageForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (isComposing) {
                return;
            }
            await sendMessage();
        });
    }
});
