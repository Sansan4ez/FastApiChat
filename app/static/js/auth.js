function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.form').forEach(form => form.classList.remove('active'));

    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Form`).classList.add('active');
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
});

const validateForm = fields => fields.every(field => field.trim() !== '');

function formatError(result) {
    if (!result) return 'Ошибка выполнения запроса.';

    if (typeof result.detail === 'string') {
        return result.detail;
    }

    if (Array.isArray(result.detail)) {
        return result.detail
            .map(item => item.msg || JSON.stringify(item))
            .join('\n');
    }

    return result.message || 'Ошибка выполнения запроса.';
}

const sendRequest = async (url, data) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok) {
            if (result.message) {
                alert(result.message);
            }
            return result;
        }

        alert(formatError(result));
        return null;
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка на сервере');
        return null;
    }
};

const handleFormSubmit = async (formType, url, fields) => {
    if (!validateForm(fields)) {
        alert('Пожалуйста, заполните все поля.');
        return null;
    }

    if (formType === 'login' && fields[1].length < 5) {
        alert('Пароль должен быть не короче 5 символов.');
        return null;
    }

    if (formType === 'register') {
        if (fields[1].trim().length < 3) {
            alert('Имя должно быть не короче 3 символов.');
            return null;
        }

        if (fields[2].length < 5) {
            alert('Пароль должен быть не короче 5 символов.');
            return null;
        }
    }

    const data = formType === 'login'
        ? {email: fields[0], password: fields[1]}
        : {email: fields[0], name: fields[1], password: fields[2], password_check: fields[3]};

    return await sendRequest(url, data);
};

document.getElementById('loginButton').addEventListener('click', async (event) => {
    event.preventDefault();

    const email = document.querySelector('#loginForm input[type="email"]').value;
    const password = document.querySelector('#loginForm input[type="password"]').value;

    const data = await handleFormSubmit('login', '/auth/login/', [email, password]);
    if (data) {
        window.location.href = '/chat';
    }
});

document.getElementById('registerButton').addEventListener('click', async (event) => {
    event.preventDefault();

    const email = document.querySelector('#registerForm input[type="email"]').value;
    const name = document.querySelector('#registerForm input[type="text"]').value;
    const password = document.querySelectorAll('#registerForm input[type="password"]')[0].value;
    const passwordCheck = document.querySelectorAll('#registerForm input[type="password"]')[1].value;

    if (password !== passwordCheck) {
        alert('Пароли не совпадают.');
        return;
    }

    await handleFormSubmit('register', '/auth/register/', [email, name, password, passwordCheck]);
});
