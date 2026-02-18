// ==================== CONFIGURAÇÃO ====================
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8888/.netlify/functions'
    : `${window.location.origin}/.netlify/functions`;

let currentOrderId = null;
let currentProductId = null;
let allOrders = [];
let allUsers = [];

// ==================== AUTENTICAÇÃO ====================

function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('Você precisa estar logado para acessar o painel.');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

async function checkAdmin() {
    try {
        const response = await fetch(`${API_URL}/get-user-profile`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!response.ok) throw new Error('Não autorizado');

        const data = await response.json();

        if (!data.user || !data.user.isAdmin) {
            alert('Acesso negado. Apenas administradores podem acessar este painel.');
            window.location.href = 'index.html';
            return false;
        }

        document.getElementById('admin-name').textContent = data.user.name;
        return true;

    } catch (error) {
        console.error('Erro ao verificar admin:', error);
        alert('Erro ao verificar permissões. Faça login novamente.');
        window.location.href = 'index.html';
        return false;
    }
}

function logoutAdmin() {
    if (confirm('Deseja sair do painel administrativo?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// ==================== REQUISIÇÕES AUTENTICADAS ====================

async function authFetch(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(`${API_URL}/${endpoint}`, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
    }

    return data;
}

// ==================== NAVEGAÇÃO ====================

function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${sectionName}-section`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    switch (sectionName) {
        case 'dashboard': loadDashboard(); break;
        case 'orders': loadOrders(); break;
        case 'users': loadUsers(); break;
        case 'products': loadProducts(); break;
    }
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
    try {
        const data = await authFetch('admin-get-stats');

        document.getElementById('total-users').textContent = data.totalUsers;
        document.getElementById('total-orders').textContent = data.totalOrders;

        const pendingCount = data.ordersByStatus.find(s => s._id === 'pending')?.count || 0;
        document.getElementById('pending-orders').textContent = pendingCount;
        document.getElementById('total-revenue').textContent = `MZN ${Number(data.totalRevenue).toFixed(2)}`;

        await loadRecentOrders();

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showToast('Erro ao carregar dados do dashboard', 'error');
    }
}

async function loadRecentOrders() {
    try {
        const data = await authFetch('admin-get-orders');
        const recentOrders = (data.orders || []).slice(0, 5);

        const listHtml = recentOrders.length > 0
            ? recentOrders.map(order => `
                <div class="activity-item">
                    <div class="activity-info">
                        <h4>${escapeHtml(order.user?.name || 'Desconhecido')} — ${escapeHtml(order.product?.name || 'Produto')}</h4>
                        <p>MZN ${Number(order.total || 0).toFixed(2)}</p>
                    </div>
                    <div>
                        <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
                        <p class="activity-date">${formatDate(order.createdAt)}</p>
                    </div>
                </div>
            `).join('')
            : '<p style="padding:15px; color:#718096;">Nenhum pedido ainda.</p>';

        document.getElementById('recent-orders-list').innerHTML = listHtml;

    } catch (error) {
        console.error('Erro ao carregar pedidos recentes:', error);
    }
}

// ==================== PEDIDOS ====================

async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">⏳ Carregando pedidos...</td></tr>';

    try {
        const data = await authFetch('admin-get-orders');
        allOrders = data.orders || [];
        renderOrders(allOrders);
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">❌ Erro ao carregar pedidos</td></tr>';
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum pedido encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td style="font-family:monospace; font-size:12px;">${String(order._id).substring(0, 8)}...</td>
            <td>${escapeHtml(order.user?.name || 'Desconhecido')}</td>
            <td>${escapeHtml(order.product?.name || 'Produto')}</td>
            <td>MZN ${Number(order.total || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <button class="btn-primary btn-small" onclick="viewOrderDetails('${order._id}')">👁 Ver</button>
                <button class="btn-secondary btn-small" onclick="showUpdateStatusModal('${order._id}', '${order.status}')">🔄 Status</button>
            </td>
        </tr>
    `).join('');
}

function filterOrders() {
    const statusFilter = document.getElementById('status-filter').value;
    const filtered = statusFilter === 'all' ? allOrders : allOrders.filter(o => o.status === statusFilter);
    renderOrders(filtered);
}

function showUpdateStatusModal(orderId, currentStatus) {
    currentOrderId = orderId;
    document.getElementById('current-status').textContent = getStatusText(currentStatus);
    document.getElementById('new-status').value = currentStatus;
    openModal('order-status-modal');
}

async function updateOrderStatus() {
    const newStatus = document.getElementById('new-status').value;

    try {
        await authFetch('admin-update-order-status', {
            method: 'POST',
            body: JSON.stringify({ orderId: currentOrderId, status: newStatus })
        });

        showToast('✅ Status atualizado com sucesso!');
        closeModal('order-status-modal');
        loadOrders();

    } catch (error) {
        showToast('❌ Erro ao atualizar status: ' + error.message, 'error');
    }
}

function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o._id === orderId);
    if (!order) return;

    const detailsHtml = `
        <div style="line-height:1.8;">
            <h3 style="color:#667eea; margin-bottom:12px;">📋 Informações do Pedido</h3>
            <p><strong>ID:</strong> <code>${order._id}</code></p>
            <p><strong>Data:</strong> ${formatDate(order.createdAt)}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></p>

            <h3 style="color:#667eea; margin:20px 0 12px;">👤 Cliente</h3>
            <p><strong>Nome:</strong> ${escapeHtml(order.user?.name || '—')}</p>
            <p><strong>Email:</strong> ${escapeHtml(order.user?.email || '—')}</p>

            <h3 style="color:#667eea; margin:20px 0 12px;">📍 Entrega</h3>
            <p><strong>Nome:</strong> ${escapeHtml(order.customerInfo?.name || '—')}</p>
            <p><strong>Endereço:</strong> ${escapeHtml(order.customerInfo?.address || '—')}</p>
            <p><strong>Cidade:</strong> ${escapeHtml(order.customerInfo?.city || '—')}</p>
            <p><strong>Telefone:</strong> ${escapeHtml(order.customerInfo?.phone || '—')}</p>

            <h3 style="color:#667eea; margin:20px 0 12px;">🛒 Produto</h3>
            <p><strong>Nome:</strong> ${escapeHtml(order.product?.name || '—')}</p>
            <p><strong>Preço:</strong> ${escapeHtml(String(order.product?.price || '—'))}</p>
            <p><strong>Total:</strong> MZN ${Number(order.total || 0).toFixed(2)}</p>

            <h3 style="color:#667eea; margin:20px 0 12px;">💳 Pagamento</h3>
            <p><strong>Método:</strong> ${escapeHtml(order.customerInfo?.paymentMethod || '—')}</p>
        </div>
    `;

    document.getElementById('order-details-content').innerHTML = detailsHtml;
    openModal('order-details-modal');
}

// ==================== USUÁRIOS ====================

async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="loading">⏳ Carregando usuários...</td></tr>';

    try {
        const data = await authFetch('admin-get-users');
        allUsers = data.users || [];

        if (allUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum usuário encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = allUsers.map(user => `
            <tr>
                <td>${escapeHtml(user.name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td>${user.isAdmin ? '✅ Admin' : '❌ Não'}</td>
                <td>
                    ${!user.isAdmin
                        ? `<button class="btn-danger btn-small" onclick="deleteUser('${user._id}', '${escapeHtml(user.name)}')">🗑 Deletar</button>`
                        : '<span style="color:#a0aec0; font-size:13px;">— Protegido —</span>'
                    }
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="loading">❌ Erro ao carregar usuários</td></tr>';
    }
}

async function deleteUser(userId, userName) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar o usuário "${userName}"?\nEsta ação não pode ser desfeita.`)) return;

    try {
        await authFetch('admin-delete-user', {
            method: 'POST',
            body: JSON.stringify({ userId })
        });
        showToast(`✅ Usuário "${userName}" deletado.`);
        loadUsers();
    } catch (error) {
        showToast('❌ Erro ao deletar usuário: ' + error.message, 'error');
    }
}

// ==================== PRODUTOS ====================

async function loadProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '<div class="loading">⏳ Carregando produtos...</div>';

    try {
        const response = await fetch(`${API_URL}/get-products`);
        const data = await response.json();
        const products = data.products || [];

        if (products.length === 0) {
            grid.innerHTML = '<div class="loading">Nenhum produto cadastrado. Clique em "Adicionar Produto" para começar.</div>';
            return;
        }

        grid.innerHTML = products.map(product => {
            const imgSrc = product.image || product.emoji || '';
            const isUrl = imgSrc.startsWith('http') || imgSrc.includes('/');
            const imageHtml = isUrl
                ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(product.name)}" onerror="this.src='https://placehold.co/300x200?text=Sem+Imagem'">`
                : `<div style="font-size:60px; text-align:center; padding:20px;">${imgSrc || '📦'}</div>`;

            return `
                <div class="product-card">
                    ${imageHtml}
                    <h3>${escapeHtml(product.name)}</h3>
                    <p class="price">MZN ${Number(product.price || 0).toFixed(2)}</p>
                    <p style="color:#718096; font-size:13px; margin-bottom:15px;">${escapeHtml(product.description || '')}</p>
                    <div class="actions">
                        <button class="btn-primary btn-small" onclick="editProduct('${product._id}')">✏️ Editar</button>
                        <button class="btn-danger btn-small" onclick="deleteProduct('${product._id}', '${escapeHtml(product.name)}')">🗑 Deletar</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        grid.innerHTML = '<div class="loading">❌ Erro ao carregar produtos</div>';
    }
}

function showAddProductModal() {
    currentProductId = null;
    document.getElementById('product-modal-title').textContent = '➕ Adicionar Produto';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    openModal('product-modal');
}

async function editProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/get-products`);
        const data = await response.json();
        const product = (data.products || []).find(p => p._id === productId);
        if (!product) return;

        currentProductId = productId;
        document.getElementById('product-modal-title').textContent = '✏️ Editar Produto';
        document.getElementById('product-id').value = productId;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-image').value = product.image || product.emoji || '';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-full-description').value = product.fullDescription || '';
        document.getElementById('product-specs').value = (product.specs || []).join('\n');

        openModal('product-modal');

    } catch (error) {
        showToast('❌ Erro ao carregar produto: ' + error.message, 'error');
    }
}

async function deleteProduct(productId, productName) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar "${productName}"?\nEsta ação não pode ser desfeita.`)) return;

    try {
        await authFetch('admin-delete-product', {
            method: 'POST',
            body: JSON.stringify({ productId })
        });
        showToast(`✅ Produto "${productName}" deletado.`);
        loadProducts();
    } catch (error) {
        showToast('❌ Erro ao deletar produto: ' + error.message, 'error');
    }
}

// ==================== MODAL / FORM PRODUTO ====================

document.addEventListener('DOMContentLoaded', async function () {
    if (!checkAuth()) return;

    const isAdmin = await checkAdmin();
    if (!isAdmin) return;

    loadDashboard();

    document.getElementById('product-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        const specs = document.getElementById('product-specs').value
            .split('\n')
            .map(s => s.trim())
            .filter(s => s !== '');

        const imgValue = document.getElementById('product-image').value;

        const productData = {
            productId: currentProductId,
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            image: imgValue,
            emoji: imgValue,
            description: document.getElementById('product-description').value,
            fullDescription: document.getElementById('product-full-description').value,
            specs: specs
        };

        try {
            const endpoint = currentProductId ? 'admin-update-product' : 'admin-create-product';
            await authFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(productData)
            });

            showToast(currentProductId ? '✅ Produto atualizado!' : '✅ Produto criado!');
            closeModal('product-modal');
            loadProducts();

        } catch (error) {
            showToast('❌ Erro ao salvar produto: ' + error.message, 'error');
        }
    });
});

// ==================== MODAIS ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Fechar modal clicando fora
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'success') {
    // Remove toast existente
    const existing = document.getElementById('admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'error' ? '#f56565' : '#48bb78'};
        color: white;
        padding: 14px 22px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ==================== HELPERS ====================

function getStatusText(status) {
    const statusMap = {
        'pending': '⏳ Pendente',
        'processing': '📦 Processando',
        'shipped': '🚚 Enviado',
        'delivered': '✅ Entregue',
        'cancelled': '❌ Cancelado'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
