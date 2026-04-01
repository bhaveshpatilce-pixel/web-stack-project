/**
 * Auth Logic for TaskMaster Pro
 */

// Utility: Show Toast
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-exclamation-circle';

    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Redirect if logged in (on index.html or signup.html)
function checkAlreadyLoggedIn() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '')) {
        window.location.href = 'dashboard.html';
    }
}

// Signup Logic
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Basic Validations
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('users')) || [];

        // Check for duplicate email
        if (users.find(u => u.email === email)) {
            showToast('Email already registered', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now(),
            fullName,
            email,
            password 
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        showToast('Registration successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    });
}

// Login Logic
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            // Save session
            localStorage.setItem('loggedInUser', JSON.stringify({
                id: user.id,
                fullName: user.fullName,
                email: user.email
            }));

            showToast('Login successful! Welcome back.', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showToast('Invalid email or password', 'error');
        }
    });
}

// Check logged in status on load
document.addEventListener('DOMContentLoaded', checkAlreadyLoggedIn);
