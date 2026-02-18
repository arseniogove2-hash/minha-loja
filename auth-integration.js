// ==================== CONFIGURAÇÃO DA API ====================
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8888/.netlify/functions'
    : `${window.location.origin}/.netlify/functions`;

// ==================== FUNÇÕES AUXILIARES ====================

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

// ==================== AUTENTICAÇÃO ====================

async function registerUser(name, email, password) {
    const data = await apiRequest('register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
}

async function loginUser(email, password) {
    const data = await apiRequest('login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
}

function logoutUser() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    window.location.reload();
}

function isUserLoggedIn() {
    return !!localStorage.getItem('authToken');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

// ==================== PEDIDOS ====================

async function createOrder(orderData) {
    return await apiRequest('create-order', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
}

async function getUserOrders() {
    const data = await apiRequest('get-orders');
    return data.orders;
}

// ==================== UI APÓS LOGIN ====================

function updateUIAfterLogin(user) {
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const profileSection = document.getElementById('profile-section');

    if (loginSection) loginSection.style.display = 'none';
    if (registerSection) registerSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'block';

    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email;

    const accountLink = document.getElementById('account-link');
    if (accountLink) accountLink.innerHTML = `👤 ${user.name}`;
}

function logout() {
    if (confirm('Deseja realmente sair?')) {
        logoutUser();
    }
}

// ==================== FINALIZAR COMPRA (integrado com API) ====================

async function finalizePurchase(event) {
    event.preventDefault();

    if (!isUserLoggedIn()) {
        alert('Você precisa estar logado para finalizar a compra!');
        showAccount();
        return;
    }

    const form = event.target;
    const productNameEl = document.getElementById('checkoutProductName');
    const productPriceEl = document.getElementById('checkoutProductPrice');
    const totalEl = document.getElementById('checkoutTotal');

    // Extrai o valor numérico do total
    const totalText = totalEl ? totalEl.textContent : '0';
    const totalNum = parseFloat(totalText.replace(/[^\d,.]/g, '').replace(',', '.')) || 0;

    try {
        const orderData = {
            product: {
                name: productNameEl ? productNameEl.textContent : 'Produto',
                price: productPriceEl ? productPriceEl.textContent : '0'
            },
            total: totalNum,
            customerInfo: {
                name: form[0].value,
                email: form[1].value,
                phone: form[2].value,
                address: form[3].value,
                city: form[4].value,
                paymentMethod: form[5].value
            }
        };

        await createOrder(orderData);
        alert('✅ Pedido realizado com sucesso! Obrigado pela sua compra!');
        showHome();
    } catch (error) {
        alert('Erro ao finalizar pedido: ' + error.message);
    }
}

// ==================== MOSTRAR PEDIDOS ====================

async function showOrders() {
    try {
        const orders = await getUserOrders();
        if (orders.length === 0) {
            alert('Você ainda não tem nenhum pedido.');
            return;
        }

        let msg = `📦 Seus ${orders.length} pedido(s):\n\n`;
        orders.forEach((o, i) => {
            msg += `${i + 1}. ${o.product?.name || 'Produto'} — ${o.total} (${o.status})\n`;
        });
        alert(msg);
    } catch (error) {
        alert('Erro ao buscar pedidos: ' + error.message);
    }
}

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', function () {
    // Verificar login ao carregar
    if (isUserLoggedIn()) {
        const user = getCurrentUser();
        if (user) updateUIAfterLogin(user);
    }

    // Toggle login/registro
    document.getElementById('show-register')?.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('register-section').style.display = 'block';
    });

    document.getElementById('show-login')?.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('register-section').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
    });

    // Form de Registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            try {
                const result = await registerUser(name, email, password);
                updateUIAfterLogin(result.user);
            } catch (error) {
                alert('Erro ao cadastrar: ' + error.message);
            }
        });
    }

    // Form de Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try {
                const result = await loginUser(email, password);
                updateUIAfterLogin(result.user);
            } catch (error) {
                alert('Erro ao fazer login: ' + error.message);
            }
        });
    }
});
