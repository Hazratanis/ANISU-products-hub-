// ============================================
// ANISU PRODUCTS HUB - Main Script
// ============================================

import { 
  db, storage, auth,
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
  ref, uploadBytes, getDownloadURL,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from './firebase-config.js';

// ================= GLOBAL VARIABLES =================
let allProducts = [];
let selectedProduct = null;
let selectedCountry = 'pakistani';
let selectedPayment = null;
let screenshotFile = null;
let currentUser = null;

const ADMIN_WHATSAPP = '923000000000'; // Apna number yahan daalo

// ================= PAGE ROUTER =================
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  
  if (path.includes('product.html')) {
    loadProductDetail();
  } else if (path.includes('checkout.html')) {
    loadCheckout();
  } else if (path.includes('admin.html')) {
    initAdmin();
  } else {
    loadHomepage();
  }
});

// ================= HOMEPAGE =================
async function loadHomepage() {
  const list = document.getElementById('products-list');
  if (!list) return;

  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    allProducts = [];
    snapshot.forEach(d => {
      allProducts.push({ id: d.id, ...d.data() });
    });

    if (allProducts.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <p>No products available yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = allProducts.map(p => `
      <div class="product-card" onclick="goToProduct('${p.id}')">
        <img src="${p.image || 'https://via.placeholder.com/600x300/6C5CE7/ffffff?text=Product'}" 
             alt="${p.name}" class="product-image"
             onerror="this.src='https://via.placeholder.com/600x300/6C5CE7/ffffff?text=Product'">
        <div class="product-body">
          <span class="product-badge">Paid</span>
          <h3 class="product-title">${p.name}</h3>
          <p class="product-desc">${(p.description || '').replace(/\n/g, '<br>')}</p>
          <div class="product-price">$${p.priceUSD || 0} / PKR ${p.pricePKR || 0}</div>
          <button class="btn-buy" onclick="event.stopPropagation(); goToProduct('${p.id}')">Buy Now</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading products:', err);
    list.innerHTML = `<div class="empty-state"><p>Error loading products. Please refresh.</p></div>`;
  }
}

// ================= TAB SWITCH =================
window.showTab = function(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  if (tab === 'products') {
    document.getElementById('products-tab').classList.remove('hidden');
    document.getElementById('reviews-tab').classList.add('hidden');
  } else {
    document.getElementById('products-tab').classList.add('hidden');
    document.getElementById('reviews-tab').classList.remove('hidden');
    loadReviews();
  }
};

// ================= REVIEWS =================
async function loadReviews() {
  const list = document.getElementById('reviews-list');
  if (!list) return;

  try {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const reviews = [];
    snapshot.forEach(d => reviews.push({ id: d.id, ...d.data() }));

    if (reviews.length === 0) {
      list.innerHTML = `<div class="empty-state"><p>No reviews yet. Be the first!</p></div>`;
      return;
    }

    list.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="review-top">
          <div class="review-avatar">${(r.name || 'A')[0].toUpperCase()}</div>
          <div>
            <div class="review-name">${r.name}</div>
            <div class="review-stars-small">${'★'.repeat(r.rating || 5)}</div>
          </div>
          <span class="review-date">${formatDate(r.createdAt)}</span>
        </div>
        <p class="review-text">${r.text}</p>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="empty-state"><p>Error loading reviews.</p></div>`;
  }
}

window.openReviewForm = function() {
  const name = prompt('Your name:');
  if (!name) return;
  const text = prompt('Your review:');
  if (!text) return;
  const rating = parseInt(prompt('Rating (1-5):') || '5');

  addDoc(collection(db, 'reviews'), {
    name, text, rating,
    createdAt: serverTimestamp()
  }).then(() => {
    showToast('Review submitted! Thank you.', 'success');
    loadReviews();
  }).catch(err => {
    console.error(err);
    showToast('Error submitting review', 'error');
  });
};

// ================= PRODUCT DETAIL =================
function loadProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = 'index.html';
    return;
  }

  getDoc(doc(db, 'products', id)).then(snap => {
    if (!snap.exists()) {
      window.location.href = 'index.html';
      return;
    }
    const p = { id: snap.id, ...snap.data() };
    selectedProduct = p;

    document.getElementById('detail-image').src = p.image || 'https://via.placeholder.com/600x300';
    document.getElementById('detail-title').textContent = p.name;
    document.getElementById('detail-features').innerHTML = 
      (p.features || '').split('\n').filter(f => f.trim()).map(f => `<li>${f.trim()}</li>`).join('');
    document.getElementById('detail-price').textContent = `$${p.priceUSD || 0} / PKR ${p.pricePKR || 0}`;
    document.getElementById('detail-buy').onclick = () => {
      window.location.href = `checkout.html?id=${p.id}`;
    };
  });
}

window.goToProduct = function(id) {
  window.location.href = `product.html?id=${id}`;
};

// ================= CHECKOUT =================
function loadCheckout() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = 'index.html';
    return;
  }

  getDoc(doc(db, 'products', id)).then(snap => {
    if (!snap.exists()) {
      window.location.href = 'index.html';
      return;
    }
    selectedProduct = { id: snap.id, ...snap.data() };

    document.getElementById('checkout-product').textContent = selectedProduct.name;
    document.getElementById('checkout-price').textContent = 
      `$${selectedProduct.priceUSD || 0} / PKR ${selectedProduct.pricePKR || 0}`;

    setupCheckoutHandlers();
  });
}

function setupCheckoutHandlers() {
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCountry = card.dataset.country;
      renderPaymentMethods();
    });
  });

  const fileInput = document.getElementById('screenshot-input');
  const dropZone = document.getElementById('drop-zone');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#6C5CE7';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '';
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  }

  const form = document.getElementById('checkout-form');
  if (form) {
    form.addEventListener('submit', submitOrder);
  }

  renderPaymentMethods();
}

function renderPaymentMethods() {
  const container = document.getElementById('payment-methods');
  if (!container) return;

  let methods = [];

  if (selectedCountry === 'pakistani') {
    methods = [
      { id: 'nayapay', title: 'Nayapay', detail: '0370-5568511' },
      { id: 'sadapay', title: 'Sadapay', detail: '0301-5201419' },
      { id: 'meezan', title: 'Meezan Bank', detail: 'PK33MEZN0000300114818609' }
    ];
  } else {
    methods = [
      { id: 'usdt', title: 'USDT (TRC20)', detail: 'TMuiiipRzVV2XpDMzJFTxEDDgJw9rZ6tAa2' },
      { id: 'usdc', title: 'USDC (BEP20)', detail: '0xb15702a6711c5fc994aba795a7ae1c596b10cdb' },
      { id: 'bankwire', title: 'Bank Wire (Citibank)', detail: 'SWIFT: CITIUS33 | Acc: 70581540002464305' }
    ];
  }

  container.innerHTML = methods.map(m => `
    <div class="payment-method" data-id="${m.id}" onclick="selectPayment('${m.id}', '${m.title}')">
      <div class="payment-method-title">${m.title}</div>
      <div class="payment-method-detail">${m.detail}</div>
    </div>
  `).join('');
}

window.selectPayment = function(id, title) {
  document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  selectedPayment = { id, title };
};

function handleFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large. Max 5MB.', 'error');
    return;
  }
  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file.', 'error');
    return;
  }
  screenshotFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('file-preview').innerHTML = `
      <img src="${e.target.result}" alt="Preview">
      <div class="file-preview-name">✓ ${file.name} (${(file.size/1024).toFixed(1)} KB)</div>
    `;
  };
  reader.readAsDataURL(file);
}

async function submitOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');

  const name = document.getElementById('full-name').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();

  if (!name) { showToast('Please enter your full name', 'error'); return; }
  if (!whatsapp) { showToast('Please enter WhatsApp number', 'error'); return; }
  if (!selectedPayment) { showToast('Please select payment method', 'error'); return; }
  if (!screenshotFile) { showToast('Please upload payment screenshot', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Uploading...';

  try {
    const timestamp = Date.now();
    const fileName = `screenshots/${timestamp}_${screenshotFile.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, screenshotFile);
    const screenshotURL = await getDownloadURL(storageRef);

    await addDoc(collection(db, 'orders'), {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productPrice: `$${selectedProduct.priceUSD} / PKR ${selectedProduct.pricePKR}`,
      customerName: name,
      whatsapp: whatsapp,
      country: selectedCountry,
      paymentMethod: selectedPayment.title,
      screenshotURL: screenshotURL,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    showToast('Order submitted! We will contact you on WhatsApp.', 'success');
    
    setTimeout(() => {
      document.getElementById('checkout-form').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <h2 style="margin-bottom:8px;">Order Submitted!</h2>
          <p style="margin-bottom:20px;">We will verify your payment and send your product on WhatsApp shortly.</p>
          <a href="index.html" class="btn-buy-full" style="max-width:300px;margin:0 auto;">Back to Home</a>
        </div>`;
    }, 1500);
  } catch (err) {
    console.error(err);
    showToast('Error submitting order. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Submit Payment';
  }
}

// ================= ADMIN PANEL =================
function initAdmin() {
  const loginBox = document.getElementById('login-box');
  const adminPanel = document.getElementById('admin-panel');

  onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? user.email : 'no user');
    if (user) {
      currentUser = user;
      loginBox.classList.add('hidden');
      adminPanel.classList.remove('hidden');
      loadOrders();
      loadAdminProducts();
    } else {
      loginBox.classList.remove('hidden');
      adminPanel.classList.add('hidden');
    }
  });

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      
      const email = document.getElementById('admin-email').value;
      const password = document.getElementById('admin-password').value;
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Login success');
      } catch (err) {
        console.error('Login error:', err.code, err.message);
        alert('Login Error:\n\nCode: ' + err.code + '\nMessage: ' + err.message);
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      signOut(auth);
    });
  }

  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', addProduct);
  }

  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.target;
      document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
      document.getElementById(target).classList.remove('hidden');
    });
  });
}

async function loadOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;

  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const orders = [];
    snapshot.forEach(d => orders.push({ id: d.id, ...d.data() }));

    if (orders.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No orders yet.</p></div>`;
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="order-card ${o.status}">
        <div class="order-top">
          <div>
            <div class="order-product">${o.productName}</div>
            <div class="order-info"><strong>Price:</strong> ${o.productPrice}</div>
          </div>
          <span class="order-status status-${o.status}">${o.status}</span>
        </div>
        <div class="order-info"><strong>Customer:</strong> ${o.customerName}</div>
        <div class="order-info"><strong>WhatsApp:</strong> ${o.whatsapp}</div>
        <div class="order-info"><strong>Country:</strong> ${o.country}</div>
        <div class="order-info"><strong>Payment:</strong> ${o.paymentMethod}</div>
        <div class="order-info"><strong>Date:</strong> ${formatDate(o.createdAt)}</div>
        ${o.screenshotURL ? `<img src="${o.screenshotURL}" class="order-screenshot" alt="Payment">` : ''}
        <div class="order-actions">
          <a href="${o.screenshotURL}" target="_blank" class="btn-action btn-view">🔍 View</a>
          <a href="https://wa.me/${(o.whatsapp || '').replace(/\D/g,'')}" target="_blank" class="btn-action btn-whatsapp">💬 WhatsApp</a>
          ${o.status === 'pending' ? `
            <button class="btn-action btn-verify" onclick="updateOrderStatus('${o.id}', 'verified')">✅ Verify</button>
            <button class="btn-action btn-reject" onclick="updateOrderStatus('${o.id}', 'rejected')">❌ Reject</button>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty-state"><p>Error loading orders.</p></div>`;
  }
}

window.updateOrderStatus = async function(orderId, status) {
  if (!confirm(`Mark this order as ${status}?`)) return;
  try {
    await updateDoc(doc(db, 'orders', orderId), { status });
    showToast(`Order ${status}!`, 'success');
    loadOrders();
  } catch (err) {
    console.error(err);
    showToast('Error updating order', 'error');
  }
};

async function loadAdminProducts() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const products = [];
    snapshot.forEach(d => products.push({ id: d.id, ...d.data() }));

    if (products.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No products yet. Add your first product!</p></div>`;
      return;
    }

    container.innerHTML = products.map(p => `
      <div class="product-list-item">
        <img src="${p.image || 'https://via.placeholder.com/100'}" class="product-list-img">
        <div class="product-list-info">
          <h4>${p.name}</h4>
          <p>$${p.priceUSD} / PKR ${p.pricePKR}</p>
        </div>
        <button class="btn-action btn-reject" onclick="deleteProduct('${p.id}')">🗑 Delete</button>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function addProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('add-product-btn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const name = document.getElementById('p-name').value.trim();
    const description = document.getElementById('p-description').value.trim();
    const features = document.getElementById('p-features').value.trim();
    const priceUSD = parseFloat(document.getElementById('p-price-usd').value);
    const pricePKR = parseFloat(document.getElementById('p-price-pkr').value);
    const imageFile = document.getElementById('p-image').files[0];

    if (!name || !priceUSD || !pricePKR) {
      showToast('Please fill required fields', 'error');
      btn.disabled = false;
      btn.textContent = 'Add Product';
      return;
    }

    let imageURL = '';
    if (imageFile) {
      const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      imageURL = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, 'products'), {
      name, description, features,
      priceUSD, pricePKR,
      image: imageURL,
      createdAt: serverTimestamp()
    });

    showToast('Product added successfully!', 'success');
    document.getElementById('product-form').reset();
    loadAdminProducts();
  } catch (err) {
    console.error(err);
    showToast('Error adding product', 'error');
  }
  
  btn.disabled = false;
  btn.textContent = 'Add Product';
}

window.deleteProduct = async function(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await deleteDoc(doc(db, 'products', id));
    showToast('Product deleted', 'success');
    loadAdminProducts();
  } catch (err) {
    console.error(err);
    showToast('Error deleting product', 'error');
  }
};

// ================= UTILITIES =================
function formatDate(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return date.toLocaleDateString();
}

function showToast(message, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}

window.showToast = showToast;
