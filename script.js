
// ============================================
// PARTE 1: INICIALIZAÇÃO E CONFIGURAÇÃO
// ============================================
        // Configurar link da conta (sempre visível)
        document.addEventListener('DOMContentLoaded', function() {
            const accountLink = document.getElementById('account-link');
            if (accountLink) {
                // Atualizar o visual do link baseado no status de login
                if (getCurrentUser()) {
                    accountLink.classList.add('logged-in');
                } else {
                    accountLink.classList.remove('logged-in');
                }
            }
        });
        // --- Página da Conta: Exibir dados do usuário, histórico, comentários e avaliações ---
        if (window.location.pathname.endsWith('account.html')) {
            document.addEventListener('DOMContentLoaded', function() {
                const user = getCurrentUser();
                if (!user) {
                    alert('Faça login para acessar sua conta.');
                    window.location.href = 'index.html';
                    return;
                }
                // Exibir informações do usuário
                const userInfo = document.getElementById('user-info');
                userInfo.innerHTML = `<b>Nome:</b> ${user.name}<br><b>Email:</b> ${user.email} <button onclick="logout()">Sair</button>`;

                // Exibir histórico de compras
                const historyList = document.getElementById('purchase-history');
                historyList.innerHTML = '';
                if (user.history && user.history.length > 0) {
                    user.history.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = `${item.date} - ${item.productName} - MZN ${item.price}`;
                        historyList.appendChild(li);
                    });
                } else {
                    historyList.innerHTML = '<li>Sem compras ainda.</li>';
                }

                // Exibir comentários e avaliações
                const commentsList = document.getElementById('comments-list');
                commentsList.innerHTML = '';
                if (user.comments && user.comments.length > 0) {
                    user.comments.forEach(c => {
                        const li = document.createElement('li');
                        li.innerHTML = `<b>${c.date}</b>: ${'★'.repeat(c.stars)} ${c.comment}`;
                        commentsList.appendChild(li);
                    });
                }

                // Lógica de estrelas
                let selectedStars = 0;
                document.querySelectorAll('.stars span').forEach(star => {
                    star.addEventListener('click', function() {
                        selectedStars = parseInt(this.getAttribute('data-star'));
                        document.getElementById('rating').value = selectedStars;
                        document.querySelectorAll('.stars span').forEach(s => {
                            s.style.color = (parseInt(s.getAttribute('data-star')) <= selectedStars) ? 'gold' : '#ccc';
                        });
                    });
                });

                // Enviar comentário
                const commentForm = document.getElementById('comment-form');
                commentForm.onsubmit = function(e) {
                    e.preventDefault();
                    const comment = document.getElementById('comment').value.trim();
                    const stars = parseInt(document.getElementById('rating').value);
                    if (!comment || !stars) {
                        alert('Preencha o comentário e selecione as estrelas.');
                        return;
                    }
                    const newComment = { comment, stars, date: new Date().toLocaleString() };
                    user.comments = user.comments || [];
                    user.comments.unshift(newComment);
                    // Salvar no localStorage
                    const users = getUsers().map(u => u.email === user.email ? user : u);
                    localStorage.setItem('users', JSON.stringify(users));
                    setCurrentUser(user);
                    // Atualizar lista
                    const li = document.createElement('li');
                    li.innerHTML = `<b>${newComment.date}</b>: ${'★'.repeat(newComment.stars)} ${newComment.comment}`;
                    commentsList.insertBefore(li, commentsList.firstChild);
                    commentForm.reset();
                    document.querySelectorAll('.stars span').forEach(s => s.style.color = '#ccc');
                    document.getElementById('rating').value = 0;
                };
            });
        }
let currentPage = 1;
const productsPerPage = 12;

function renderProductsWithPagination() {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const productsToShow = lojaProducts.slice(startIndex, endIndex);
    
    // Renderizar apenas produtos desta página
    renderProducts(productsToShow);
    
    // Adicionar botões de navegação
    addPaginationButtons();
}
// MongoDB Connection (exemplo, substitua pela sua string de conexão real)

        // Produtos carregados da API (MongoDB)
// Estes arrays são preenchidos dinamicamente ao carregar a página
let homeProducts = [];
const lojaProducts = [];;

let currentProduct = null;
const products = [...lojaProducts];

function createImageContent(source, altText) {
    const isImage = source && (source.includes('.jpg') || source.includes('.png') || source.includes('.jpeg') || source.includes('.webp') || source.includes('.gif'));
    if (isImage) {
        return `<img src="${source}" alt="${altText}">`;
    } else {
        return source || '🎁';
    }
}

// ==================== CARREGAR PRODUTOS DA API ====================
const _API = window.location.hostname === 'localhost'
    ? 'http://localhost:8888/.netlify/functions'
    : `${window.location.origin}/.netlify/functions`;

async function loadProductsFromAPI() {
    try {
        const res = await fetch(`${_API}/get-products`);
        const data = await res.json();
        const products = data.products || [];

        // Limpar arrays
        homeProducts.length = 0;
        lojaProducts.length = 0;

        products.forEach(p => {
            const product = {
                id: p._id,           // usa _id do MongoDB
                _id: p._id,
                name: p.name,
                price: parseFloat(p.price) || 0,
                category: p.category || 'Geral',
                description: p.description || '',
                fullDescription: p.fullDescription || '',
                emoji: p.image || p.emoji || '📦',
                images: p.images && p.images.length > 0 ? p.images : [p.image || p.emoji || '📦'],
                specs: p.specs || []
            };
            lojaProducts.push(product);
            homeProducts.push(product);
        });

        renderProducts();
        if (document.getElementById('lojaPage')?.style.display === 'block') {
            renderLojaProducts();
        }
    } catch (err) {
        console.error('Erro ao carregar produtos:', err);
        // Fallback: mostra mensagem amigável
        const grid = document.getElementById('productsGrid');
        if (grid) grid.innerHTML = '<p style="text-align:center; color:white; padding:40px;">⏳ A carregar produtos...</p>';
    }
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';
    homeProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const imageContent = createImageContent(product.emoji, product.name);
        card.innerHTML = `
            <div class="product-image">${imageContent}</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">MZN ${product.price.toFixed(2).replace('.', ',')}</div>
                <div class="product-description">${product.description}</div>
                <button class="btn-view" onclick="viewProduct(${product.id})">Ver Detalhes</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function viewProduct(productId) {
    currentProduct = lojaProducts.find(p => p.id === productId || p._id === productId || p.id == productId);
    if (!currentProduct) {alert('Produto não encontrado!'); return;}
    
    // Salvar ID do produto atual no localStorage
    localStorage.setItem('currentProductId', productId);
    
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('productPage').classList.add('active');
    document.getElementById('checkoutPage').classList.remove('active');
    document.getElementById('lojaPage').style.display = 'none';
    const firstImage = currentProduct.images[0];
    const mainImageContent = createImageContent(firstImage, currentProduct.name);
    document.getElementById('mainImage').innerHTML = mainImageContent;
    document.getElementById('detailTitle').textContent = currentProduct.name;
    document.getElementById('detailPrice').textContent = `MZN ${currentProduct.price.toFixed(2).replace('.', ',')}`;
    document.getElementById('detailDescription').textContent = currentProduct.fullDescription;
    const thumbnails = document.getElementById('thumbnails');
    thumbnails.innerHTML = '';
    currentProduct.images.forEach((img, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'thumbnail';
        const thumbContent = createImageContent(img, `${currentProduct.name} ${index + 1}`);
        thumb.innerHTML = thumbContent;
        thumb.onclick = () => {
            const mainImageContent = createImageContent(img, currentProduct.name);
            document.getElementById('mainImage').innerHTML = mainImageContent;
        };
        thumbnails.appendChild(thumb);
    });
    const specs = document.getElementById('detailSpecs');
    specs.innerHTML = '';
    currentProduct.specs.forEach(spec => {
        const li = document.createElement('li');
        li.textContent = spec;
        specs.appendChild(li);
    });
    window.scrollTo(0, 0);
}

function goToCheckout() {
    // Verificar se usuário está logado
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        alert('Para fazer uma compra, você precisa estar logado. Redirecionando para a página de login...');
        showAccount();
        return;
    }
    
    // Se estiver logado, prosseguir com checkout normal
    document.getElementById('productPage').classList.remove('active');
    document.getElementById('checkoutPage').classList.add('active');
    
    document.getElementById('checkoutProductName').textContent = currentProduct.name;
    document.getElementById('checkoutProductPrice').textContent = `MZN ${currentProduct.price.toFixed(2).replace('.', ',')}`;
    
    const total = currentProduct.price + 15.00;
    document.getElementById('checkoutTotal').textContent = `MZN ${total.toFixed(2).replace('.', ',')}`;
    
    window.scrollTo(0, 0);
}

function backToProduct() {
    document.getElementById('checkoutPage').classList.remove('active');
    document.getElementById('productPage').classList.add('active');
}

function showHome() {
    document.getElementById('homePage').style.display = 'block';
    document.getElementById('productPage').classList.remove('active');
    document.getElementById('checkoutPage').classList.remove('active');
    document.getElementById('lojaPage').style.display = 'none';
    window.scrollTo(0, 0);
}


// ============================================
// FUNÇÃO FINALIZAR COMPRA COM WHATSAPP
// ============================================
function showLoading() {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = '<div class="spinner">🔄 Carregando...</div>';
    document.body.appendChild(loader);
}

function hideLoading() {
    document.getElementById('global-loader')?.remove();
}
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
// Cache de produtos para não buscar sempre
const productCache = {
    data: null,
    timestamp: null,
    maxAge: 5 * 60 * 1000, // 5 minutos
    
    get() {
        if (this.data && (Date.now() - this.timestamp) < this.maxAge) {
            return this.data;
        }
        return null;
    },
    
    set(data) {
        this.data = data;
        this.timestamp = Date.now();
    }
};
function finalizePurchase(event) {
    event.preventDefault();

    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('Você precisa estar logado para finalizar a compra!');
        showAccount();
        return;
    }

    const form = event.target;
    const productId = parseInt(localStorage.getItem('currentProductId'));
    let product = currentProduct || lojaProducts.find(p => p.id === productId);

    if (!product) {
        alert('Erro ao processar pedido. Produto não encontrado.');
        return;
    }

    const orderData = {
        product: {
            name: product.name,
            price: `MZN ${product.price.toFixed(2)}`
        },
        total: product.price,
        customerInfo: {
            name: form.querySelector('input[type="text"]').value,
            email: form.querySelector('input[type="email"]').value,
            phone: form.querySelector('input[type="tel"]').value,
            address: form.querySelectorAll('input[type="text"]')[1]?.value || '',
            city: form.querySelectorAll('input[type="text"]')[2]?.value || '',
            paymentMethod: form.querySelector('select').value
        }
    };

    const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:8888/.netlify/functions'
        : `${window.location.origin}/.netlify/functions`;

    const btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Processando...'; }

    fetch(`${apiUrl}/create-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        // Enviar WhatsApp se existir a função
        if (typeof sendWhatsAppMessage === 'function') {
            const fakeOrder = { orderNumber: String(data.orderId).slice(-8).toUpperCase(), productName: product.name, price: product.price, frete: 0, total: product.price, customerInfo: { nome: orderData.customerInfo.name, email: orderData.customerInfo.email, telefone: orderData.customerInfo.phone, endereco: orderData.customerInfo.address, cidade: orderData.customerInfo.city, pagamento: orderData.customerInfo.paymentMethod } };
            sendWhatsAppMessage(fakeOrder, product);
        } else {
            showOrderConfirmationSimple(product, orderData);
        }
    })
    .catch(err => {
        if (btn) { btn.disabled = false; btn.textContent = 'Finalizar Pagamento'; }
        alert('Erro ao realizar pedido: ' + err.message);
    });
}

function showOrderConfirmationSimple(product, orderData) {
    alert(`✅ Pedido realizado com sucesso!\n\nProduto: ${product.name}\nValor: MZN ${product.price.toFixed(2)}\nPagamento: ${orderData.customerInfo.paymentMethod}\n\nEntraremos em contacto quando o produto chegar a Moçambique!`);
    showHome();
}


// Função para gerar número de pedido
function generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `PED${timestamp}${random}`.substring(0, 15);
}

// Função para enviar mensagem ao WhatsApp
function sendWhatsAppMessage(order, product) {
    const whatsappNumber = '258840000000'; // ALTERE AQUI PARA SEU NÚMERO!
    
    const message = `
🛍️ *NOVO PEDIDO RECEBIDO*

📋 *Pedido:* ${order.orderNumber}
📅 *Data:* ${order.date}

👤 *CLIENTE*
Nome: ${order.customerInfo.nome}
Email: ${order.customerInfo.email}
Telefone: ${order.customerInfo.telefone}

📍 *ENDEREÇO DE ENTREGA*
${order.customerInfo.endereco}
Cidade: ${order.customerInfo.cidade}

🛒 *PRODUTO*
${order.productName}
Preço: MZN ${order.price.toFixed(2)}
Frete: MZN ${order.frete.toFixed(2)}
*Total: MZN ${order.total.toFixed(2)}*

💳 *Forma de Pagamento:* ${getPaymentMethodName(order.customerInfo.pagamento)}

---
Atualizar status do pedido no sistema! 📦
    `.trim();
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

// Função auxiliar para nome do método de pagamento
function getPaymentMethodName(method) {
    const methods = {
        'credit': 'Cartão de Crédito',
        'debit': 'Cartão de Débito',
        'pix': 'M-Pesa'
    };
    return methods[method] || method;
}

// Função para mostrar confirmação do pedido
function showOrderConfirmation(order) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content order-confirmation-modal">
            <div class="modal-header success-header">
                <h2>✅ Pedido Realizado com Sucesso!</h2>
            </div>
            <div class="modal-body">
                <div class="confirmation-content">
                    <div class="confirmation-icon">🎉</div>
                    <h3>Obrigado pela sua compra!</h3>
                    <p>Seu pedido foi recebido e já enviamos os detalhes para o WhatsApp.</p>
                    
                    <div class="order-summary-box">
                        <div class="summary-row">
                            <span>Número do Pedido:</span>
                            <strong>${order.orderNumber}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Data:</span>
                            <strong>${order.date}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Total:</span>
                            <strong style="color: #f5576c;">MZN ${order.total.toFixed(2)}</strong>
                        </div>
                    </div>
                    
                    <p class="confirmation-message">
                        📱 Uma mensagem foi enviada para o WhatsApp com os detalhes do seu pedido.<br>
                        📧 Você também receberá um email de confirmação em breve.
                    </p>
                    
                    <div class="confirmation-actions">
                        <button class="btn-primary" onclick="closeModal(); showHome();">Continuar Comprando</button>
                        <button class="btn-secondary" onclick="closeModal(); showOrders();">Ver Meus Pedidos</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
            showHome();
        }
    };
}

function showLoja() {
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('productPage').classList.remove('active');
    document.getElementById('checkoutPage').classList.remove('active');
    document.getElementById('lojaPage').style.display = 'block';
    if (lojaProducts.length === 0) { loadProductsFromAPI(); return; }
    renderLojaProducts();
    window.scrollTo(0, 0);
}

function renderLojaProducts() {
    const lojaGrid = document.getElementById('lojaGrid');
    lojaGrid.innerHTML = '';
    lojaProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const imageContent = createImageContent(product.emoji, product.name);
        card.innerHTML = `
            <div class="product-image">${imageContent}</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">MZN ${product.price.toFixed(2).replace('.', ',')}</div>
                <div class="product-description">${product.description}</div>
                <button class="btn-view" onclick="viewProduct(${product.id})">Ver Detalhes</button>
            </div>
        `;
        lojaGrid.appendChild(card);
    });
}

// Funções da Página de Conta
let currentUser = null;

function updateAccountMenu() {
    console.log('Atualizando menu da conta...');
    const accountLink = document.getElementById('account-link');
    const currentUser = getCurrentUser();
    
    console.log('Account link encontrado:', accountLink);
    console.log('Current user:', currentUser);
    
    if (currentUser) {
        accountLink.innerHTML = '👤 ' + currentUser.name;
        accountLink.title = 'Minha Conta - ' + currentUser.name;
        accountLink.classList.add('logged-in');
        console.log('Usuário logado, menu atualizado:', accountLink.innerHTML);
    } else {
        accountLink.innerHTML = '👤 Minha Conta';
        accountLink.title = 'Fazer Login ou Cadastro';
        accountLink.classList.remove('logged-in');
        console.log('Usuário deslogado, menu padrão:', accountLink.innerHTML);
    }
}

function showAccount() {
    // Esconder todas as páginas
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('productPage').classList.remove('active');
    document.getElementById('checkoutPage').classList.remove('active');
    document.getElementById('lojaPage').style.display = 'none';
    
    // Mostrar página de conta
    document.getElementById('accountPage').style.display = 'block';
    
    // Verificar se usuário está logado
    const currentUser = getCurrentUser();
    if (currentUser) {
        showProfileSection();
    } else {
        showLoginSection();
    }
    
    window.scrollTo(0, 0);
}

function showProfileSection() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('profile-name').textContent = currentUser.name;
        document.getElementById('profile-email').textContent = currentUser.email;
    }
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('profile-section').style.display = 'block';
}

function showLoginSection() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('profile-section').style.display = 'none';
}

function showRegisterSection() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('profile-section').style.display = 'none';
}

function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        showLoginSection();
        updateAccountMenu();
    }
}
// LOCALIZE AS FUNÇÕES showOrders() e showSettings() 
// (por volta da linha 918-924) e SUBSTITUA por este código:
// ============================================
// CÓDIGO ATUALIZADO PARA SEU script.js
// ============================================

// SUBSTITUA a função finalizePurchase (linha 808) por esta versão:


function generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `PED${timestamp}${random}`.substring(0, 15);
}

// Função para enviar mensagem ao WhatsApp
function sendWhatsAppMessage(order, product) {
    const whatsappNumber = '+8617326114206'; // SEU NÚMERO AQUI (formato: código do país + DDD + número)
    
    // Criar mensagem formatada
    const message = `
🛍️ *NOVO PEDIDO RECEBIDO*

📋 *Pedido:* ${order.orderNumber}
📅 *Data:* ${order.date}

👤 *CLIENTE*
Nome: ${order.customerInfo.nome}
Email: ${order.customerInfo.email}
Telefone: ${order.customerInfo.telefone}

📍 *ENDEREÇO DE ENTREGA*
${order.customerInfo.endereco}
Cidade: ${order.customerInfo.cidade}

🛒 *PRODUTO*
${order.productName}
Preço: MZN ${order.price.toFixed(2)}
Frete: MZN ${order.frete.toFixed(2)}
*Total: MZN ${order.total.toFixed(2)}*

💳 *Forma de Pagamento:* ${getPaymentMethodName(order.customerInfo.pagamento)}

---
Atualizar status do pedido no sistema! 📦
    `.trim();
    
    // Codificar mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Criar link do WhatsApp
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    // Abrir WhatsApp em nova aba
    window.open(whatsappUrl, '_blank');
}

// Função auxiliar para nome do método de pagamento
function getPaymentMethodName(method) {
    const methods = {
        'credit': 'Cartão de Crédito',
        'debit': 'Cartão de Débito',
        'pix': 'M-Pesa'
    };
    return methods[method] || method;
}

// Função para mostrar confirmação do pedido
function showOrderConfirmation(order) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content order-confirmation-modal">
            <div class="modal-header success-header">
                <h2>✅ Pedido Realizado com Sucesso!</h2>
            </div>
            <div class="modal-body">
                <div class="confirmation-content">
                    <div class="confirmation-icon">🎉</div>
                    <h3>Obrigado pela sua compra!</h3>
                    <p>Seu pedido foi recebido e já enviamos os detalhes para o WhatsApp.</p>
                    
                    <div class="order-summary-box">
                        <div class="summary-row">
                            <span>Número do Pedido:</span>
                            <strong>${order.orderNumber}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Data:</span>
                            <strong>${order.date}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Total:</span>
                            <strong style="color: #f5576c;">MZN ${order.total.toFixed(2)}</strong>
                        </div>
                    </div>
                    
                    <p class="confirmation-message">
                        📱 Uma mensagem foi enviada para o WhatsApp com os detalhes do seu pedido.<br>
                        📧 Você também receberá um email de confirmação em breve.
                    </p>
                    
                    <div class="confirmation-actions">
                        <button class="btn-primary" onclick="closeModal(); showHome();">Continuar Comprando</button>
                        <button class="btn-secondary" onclick="closeModal(); showOrders();">Ver Meus Pedidos</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar fora
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
            showHome();
        }
    };
}

// ============================================
// SUBSTITUA a função showOrders por esta versão COMPLETA:


// ============================================
// FUNÇÃO MEUS PEDIDOS COM STATUS
// ============================================
function showOrders() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('Faça login para ver seus pedidos.');
        showAccount();
        return;
    }

    // Criar modal de pedidos
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content orders-modal">
            <div class="modal-header">
                <h2>📦 Meus Pedidos</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="orders-list"><p style="text-align:center; padding:20px;">⏳ Carregando pedidos...</p></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.onclick = function(e) { if (e.target === modal) closeModal(); };

    // Buscar pedidos da API
    const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:8888/.netlify/functions'
        : `${window.location.origin}/.netlify/functions`;

    fetch(`${apiUrl}/get-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
        const ordersList = document.getElementById('orders-list');
        const orders = data.orders || [];

        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3>Nenhum pedido ainda</h3>
                    <p>Quando você fizer compras, elas aparecerão aqui.</p>
                    <button class="btn-primary" onclick="closeModal(); showLoja();">Ir para Loja</button>
                </div>`;
            return;
        }

        const statusMap = {
            pending:    { icon: '⏳', text: 'Pendente',    cls: 'status-pending' },
            processing: { icon: '📦', text: 'Processando', cls: 'status-processing' },
            shipped:    { icon: '🚚', text: 'Enviado',     cls: 'status-shipped' },
            delivered:  { icon: '✅', text: 'Entregue',    cls: 'status-delivered' },
            cancelled:  { icon: '❌', text: 'Cancelado',   cls: 'status-cancelled' }
        };

        ordersList.innerHTML = orders.map(order => {
            const s = statusMap[order.status] || { icon: '📋', text: order.status, cls: '' };
            const date = new Date(order.createdAt).toLocaleDateString('pt-BR');
            const total = typeof order.total === 'number' ? `MZN ${order.total.toFixed(2)}` : order.total;
            return `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-number">Pedido #${String(order._id).slice(-8).toUpperCase()}</div>
                            <div class="order-date">${date}</div>
                        </div>
                        <span class="order-status ${s.cls}">${s.icon} ${s.text}</span>
                    </div>
                    <div class="order-body">
                        <div class="order-product"><strong>${order.product?.name || 'Produto'}</strong></div>
                        <div class="order-price-info">
                            <div class="order-total">Total: ${total}</div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    })
    .catch(err => {
        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = '<p style="color:red; padding:20px; text-align:center;">❌ Erro ao carregar pedidos. Tente novamente.</p>';
        console.error('Erro pedidos:', err);
    });
}


function getOrderStatusInfo(status) {
    const statusMap = {
        'pending': { text: 'Aguardando Confirmação', icon: '⏳', class: 'status-pending' },
        'processing': { text: 'Em Processamento', icon: '📋', class: 'status-processing' },
        'shipped': { text: 'Em Transporte', icon: '🚚', class: 'status-shipped' },
        'delivered': { text: 'Entregue', icon: '✅', class: 'status-delivered' },
        'cancelled': { text: 'Cancelado', icon: '❌', class: 'status-cancelled' }
    };
    return statusMap[status] || statusMap['pending'];
}

function showOrderTracking(orderNumber) {
    const currentUser = getCurrentUser();
    const order = currentUser.orders.find(o => o.orderNumber === orderNumber);
    
    if (!order) {
        alert('Pedido não encontrado.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content tracking-modal">
            <div class="modal-header">
                <h2>📍 Rastreamento do Pedido</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="tracking-header">
                    <div class="tracking-order-number">Pedido #${order.orderNumber}</div>
                    <div class="tracking-product">${order.productName}</div>
                </div>
                
                <div class="tracking-timeline">
                    ${generateTrackingTimeline(order)}
                </div>
                
                <div class="tracking-footer">
                    <button class="btn-secondary" onclick="closeModal()">Fechar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
        }
    };
}

function generateTrackingTimeline(order) {
    const updates = order.trackingUpdates || [
        {
            date: order.date,
            status: 'Pedido Recebido',
            description: 'Seu pedido foi recebido e está sendo processado.'
        }
    ];
    
    let html = '';
    updates.forEach((update, index) => {
        const isFirst = index === 0;
        html += `
            <div class="tracking-item ${isFirst ? 'active' : ''}">
                <div class="tracking-icon">${isFirst ? '●' : '○'}</div>
                <div class="tracking-content">
                    <div class="tracking-status">${update.status}</div>
                    <div class="tracking-date">${update.date}</div>
                    <div class="tracking-description">${update.description}</div>
                </div>
            </div>
        `;
    });
    
    return html;
}

function showOrderDetails(orderNumber) {
    const currentUser = getCurrentUser();
    const order = currentUser.orders.find(o => o.orderNumber === orderNumber);
    
    if (!order) {
        alert('Pedido não encontrado.');
        return;
    }
    
    const statusInfo = getOrderStatusInfo(order.status);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content details-modal">
            <div class="modal-header">
                <h2>ℹ️ Detalhes do Pedido</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="details-section">
                    <h3>📋 Informações do Pedido</h3>
                    <div class="details-row">
                        <span>Número:</span>
                        <strong>${order.orderNumber}</strong>
                    </div>
                    <div class="details-row">
                        <span>Data:</span>
                        <strong>${order.date}</strong>
                    </div>
                    <div class="details-row">
                        <span>Status:</span>
                        <span class="order-status ${statusInfo.class}">${statusInfo.icon} ${statusInfo.text}</span>
                    </div>
                </div>
                
                <div class="details-section">
                    <h3>🛒 Produto</h3>
                    <div class="details-row">
                        <span>${order.productName}</span>
                        <strong>MZN ${order.price.toFixed(2)}</strong>
                    </div>
                    <div class="details-row">
                        <span>Frete</span>
                        <strong>MZN ${order.frete.toFixed(2)}</strong>
                    </div>
                    <div class="details-row total-row">
                        <span>Total</span>
                        <strong>MZN ${order.total.toFixed(2)}</strong>
                    </div>
                </div>
                
                <div class="details-section">
                    <h3>📍 Entrega</h3>
                    <div class="details-info">
                        <p><strong>${order.customerInfo.nome}</strong></p>
                        <p>${order.customerInfo.endereco}</p>
                        <p>${order.customerInfo.cidade}</p>
                        <p>Tel: ${order.customerInfo.telefone}</p>
                    </div>
                </div>
                
                <div class="details-section">
                    <h3>💳 Pagamento</h3>
                    <div class="details-row">
                        <span>Método:</span>
                        <strong>${getPaymentMethodName(order.customerInfo.pagamento)}</strong>
                    </div>
                </div>
                
                <div class="details-footer">
                    <button class="btn-secondary" onclick="closeModal()">Fechar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
        }
    };
}

// ============================================
// FUNÇÃO CONFIGURAÇÕES
// ============================================
function showSettings() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Faça login para acessar configurações.');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content settings-modal">
            <div class="modal-header">
                <h2>⚙️ Configurações</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="settings-form" onsubmit="saveSettings(event)">
                    <div class="settings-section">
                        <h3>Informações Pessoais</h3>
                        <div class="form-group">
                            <label>Nome Completo</label>
                            <input type="text" id="settings-name" value="${currentUser.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="settings-email" value="${currentUser.email}" disabled>
                            <small>O email não pode ser alterado</small>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Alterar Senha</h3>
                        <div class="form-group">
                            <label>Senha Atual</label>
                            <input type="password" id="settings-current-password" placeholder="Digite sua senha atual">
                        </div>
                        <div class="form-group">
                            <label>Nova Senha</label>
                            <input type="password" id="settings-new-password" placeholder="Digite a nova senha">
                        </div>
                        <div class="form-group">
                            <label>Confirmar Nova Senha</label>
                            <input type="password" id="settings-confirm-password" placeholder="Confirme a nova senha">
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Preferências</h3>
                        <div class="form-group-checkbox">
                            <label>
                                <input type="checkbox" id="settings-notifications" ${currentUser.notifications !== false ? 'checked' : ''}>
                                <span>Receber notificações por email</span>
                            </label>
                        </div>
                        <div class="form-group-checkbox">
                            <label>
                                <input type="checkbox" id="settings-newsletter" ${currentUser.newsletter !== false ? 'checked' : ''}>
                                <span>Receber newsletter e promoções</span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
        }
    };
}

function saveSettings(event) {
    event.preventDefault();
    
    const currentUser = getCurrentUser();
    const newName = document.getElementById('settings-name').value;
    const currentPassword = document.getElementById('settings-current-password').value;
    const newPassword = document.getElementById('settings-new-password').value;
    const confirmPassword = document.getElementById('settings-confirm-password').value;
    const notifications = document.getElementById('settings-notifications').checked;
    const newsletter = document.getElementById('settings-newsletter').checked;

    if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword) {
            alert('Digite sua senha atual para fazer alterações.');
            return;
        }
        if (currentPassword !== currentUser.password) {
            alert('Senha atual incorreta.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            alert('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }
        currentUser.password = newPassword;
    }

    currentUser.name = newName;
    currentUser.notifications = notifications;
    currentUser.newsletter = newsletter;

    const users = getUsers().map(u => u.email === currentUser.email ? currentUser : u);
    localStorage.setItem('users', JSON.stringify(users));
    setCurrentUser(currentUser);

    const profileName = document.getElementById('profile-name');
    if (profileName) {
        profileName.textContent = currentUser.name;
    }

    alert('Configurações salvas com sucesso!');
    closeModal();
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function searchProducts(event) {
    if (event.key === 'Enter') {performSearch();}
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    if (searchTerm === '') {alert('Por favor, digite algo para pesquisar.'); return;}
    const searchResults = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.fullDescription.toLowerCase().includes(searchTerm) ||
        product.specs.some(spec => spec.toLowerCase().includes(searchTerm))
    );
    if (searchResults.length === 0) {alert(`Nenhum produto encontrado para "${searchTerm}".`); return;}
    showSearchResults(searchResults, searchTerm);
}

function showSearchResults(results, searchTerm) {
    showLoja();
    const lojaGrid = document.getElementById('lojaGrid');
    lojaGrid.innerHTML = '';
    const resultsTitle = document.createElement('div');
    resultsTitle.className = 'search-results-title';
    resultsTitle.innerHTML = `
        <h2>Resultados da Pesquisa: "${searchTerm}"</h2>
        <p>${results.length} produto(s) encontrado(s)</p>
        <button class="btn-clear-search" onclick="clearSearch()">Limpar Pesquisa</button>
    `;
    lojaGrid.appendChild(resultsTitle);
    results.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card search-result';
        const imageContent = createImageContent(product.emoji, product.name);
        card.innerHTML = `
            <div class="product-image">${imageContent}</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">MZN ${product.price.toFixed(2).replace('.', ',')}</div>
                <div class="product-description">${product.description}</div>
                <button class="btn-view" onclick="viewProduct(${product.id})">Ver Detalhes</button>
            </div>
        `;
        lojaGrid.appendChild(card);
    });
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    renderLojaProducts();
}

function buyFromLoja(productId) {
    // Verificar se usuário está logado
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        alert('Para fazer uma compra, você precisa estar logado. Redirecionando para a página de login...');
        showAccount();
        return;
    }
    
    // Se estiver logado, prosseguir com compra normal
    viewProduct(productId);
    setTimeout(() => {
        goToCheckout();
    }, 100);
}

// --- Autenticação Simples (LocalStorage) ---
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUser(user) {
    const users = getUsers();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
}

function findUser(email, password) {
    return getUsers().find(u => u.email === email && u.password === password);
}

function getCurrentUser() {
    // Lê do novo sistema (auth-integration.js) primeiro, depois do antigo
    const newUser = localStorage.getItem('user');
    if (newUser) return JSON.parse(newUser);
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
}

//function logout() {
   // localStorage.removeItem('currentUser');
   // window.location.reload();
//}

function showAccountPage() {
    window.location.href = 'account.html';
}

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar menu da conta
    updateAccountMenu();
    // Carregar produtos do MongoDB via API
    loadProductsFromAPI();
});