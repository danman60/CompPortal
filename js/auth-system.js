/**
 * Authentication System with Visual Login/Logout Flow
 * Professional authentication UI components for CompPortal demo
 */

class AuthSystem {
    constructor() {
        this.isAuthenticated = localStorage.getItem('compportal_auth') === 'true';
        this.currentUser = JSON.parse(localStorage.getItem('compportal_user') || '{}');
        this.init();
    }

    init() {
        this.createLoginModal();
        this.bindEvents();
        this.updateUI();
    }

    createLoginModal() {
        const modalHTML = `
        <!-- Login Modal -->
        <div id="login-modal" class="fixed inset-0 z-50 hidden">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="authSystem.hideLogin()"></div>

            <!-- Modal -->
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
                    <!-- Close button -->
                    <button onclick="authSystem.hideLogin()" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>

                    <!-- ComputitionHQ Branding -->
                    <div class="text-center mb-8">
                        <div class="h-16 w-16 bg-gradient-to-br from-dance-pink to-dance-purple rounded-xl flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-crown text-white text-2xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                        <p class="text-gray-300 text-sm">Sign in to ComputitionHQ Portal</p>
                    </div>

                    <!-- Login Form -->
                    <form id="login-form" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                            <div class="relative">
                                <i class="fas fa-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                <input type="email" id="login-email" required
                                    class="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dance-purple focus:border-transparent transition-all"
                                    placeholder="Enter your email">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <div class="relative">
                                <i class="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                <input type="password" id="login-password" required
                                    class="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dance-purple focus:border-transparent transition-all"
                                    placeholder="Enter your password">
                                <button type="button" onclick="authSystem.togglePassword()" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                                    <i id="password-toggle-icon" class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Remember Me & Forgot Password -->
                        <div class="flex items-center justify-between">
                            <label class="flex items-center">
                                <input type="checkbox" class="rounded bg-white/10 border-white/20 text-dance-purple focus:ring-dance-purple">
                                <span class="ml-2 text-sm text-gray-300">Remember me</span>
                            </label>
                            <a href="#" class="text-sm text-dance-purple hover:text-dance-pink transition-colors">Forgot password?</a>
                        </div>

                        <!-- Demo Login Options -->
                        <div class="space-y-3">
                            <button type="submit" class="w-full bg-gradient-to-r from-dance-purple to-dance-pink text-white py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-dance-purple/20 transition-all duration-300 transform hover:scale-[1.02]">
                                <i class="fas fa-sign-in-alt mr-2"></i>
                                Sign In
                            </button>

                            <div class="relative">
                                <div class="absolute inset-0 flex items-center">
                                    <div class="w-full border-t border-white/20"></div>
                                </div>
                                <div class="relative flex justify-center text-sm">
                                    <span class="px-2 bg-transparent text-gray-400">Demo Accounts</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <button type="button" onclick="authSystem.demoLogin('studio')" class="bg-white/5 hover:bg-white/10 text-white py-2 px-3 rounded-lg text-sm transition-colors border border-white/20">
                                    <i class="fas fa-building mr-1"></i>
                                    Studio Owner
                                </button>
                                <button type="button" onclick="authSystem.demoLogin('admin')" class="bg-white/5 hover:bg-white/10 text-white py-2 px-3 rounded-lg text-sm transition-colors border border-white/20">
                                    <i class="fas fa-crown mr-1"></i>
                                    Admin
                                </button>
                            </div>
                        </div>
                    </form>

                    <!-- Loading State -->
                    <div id="login-loading" class="hidden text-center py-8">
                        <div class="animate-spin rounded-full h-12 w-12 border-2 border-dance-purple border-t-transparent mx-auto mb-4"></div>
                        <p class="text-gray-300">Authenticating...</p>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        // Login form submission
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout buttons
        document.querySelectorAll('[data-action="logout"]').forEach(btn => {
            btn.addEventListener('click', () => this.logout());
        });

        // Update existing logout buttons
        document.querySelectorAll('.fas.fa-sign-out-alt').forEach(btn => {
            if (btn.parentElement.tagName === 'BUTTON') {
                btn.parentElement.setAttribute('data-action', 'logout');
            }
        });
    }

    showLogin() {
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('login-email').focus();
    }

    hideLogin() {
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('login-loading').classList.add('hidden');
    }

    togglePassword() {
        const passwordInput = document.getElementById('login-password');
        const toggleIcon = document.getElementById('password-toggle-icon');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // Show loading state
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('login-loading').classList.remove('hidden');

        // Simulate authentication delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Demo authentication (accept any email/password)
        if (email && password) {
            this.authenticate({
                email: email,
                name: this.extractNameFromEmail(email),
                role: email.includes('admin') ? 'admin' : 'studio_owner',
                studio: email.includes('admin') ? 'ComputitionHQ' : 'Uxbridge Dance Academy',
                initials: this.getInitials(email)
            });
        } else {
            this.showLoginError('Please enter both email and password');
        }
    }

    demoLogin(type) {
        // Show loading state
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('login-loading').classList.remove('hidden');

        setTimeout(() => {
            const demoUsers = {
                studio: {
                    email: 'emily@uxbridgedance.com',
                    name: 'Emily Einsmann',
                    role: 'studio_owner',
                    studio: 'Uxbridge Dance Academy',
                    initials: 'UDA'
                },
                admin: {
                    email: 'admin@computitionhq.com',
                    name: 'Competition Director',
                    role: 'admin',
                    studio: 'ComputitionHQ',
                    initials: 'CHQ'
                }
            };

            this.authenticate(demoUsers[type]);
        }, 1000);
    }

    authenticate(user) {
        this.isAuthenticated = true;
        this.currentUser = user;

        // Store in localStorage
        localStorage.setItem('compportal_auth', 'true');
        localStorage.setItem('compportal_user', JSON.stringify(user));

        // Update UI
        this.updateUI();
        this.hideLogin();

        // Show success notification
        if (window.NotificationSystem) {
            window.NotificationSystem.show(
                `Welcome back, ${user.name}!`,
                'Successfully signed in to ComputitionHQ Portal',
                'success',
                5000
            );
        }
    }

    logout() {
        // Show confirmation for better UX
        const confirmLogout = confirm('Are you sure you want to sign out?');
        if (!confirmLogout) return;

        this.isAuthenticated = false;
        this.currentUser = {};

        // Clear localStorage
        localStorage.removeItem('compportal_auth');
        localStorage.removeItem('compportal_user');

        // Update UI
        this.updateUI();

        // Show logout notification
        if (window.NotificationSystem) {
            window.NotificationSystem.show(
                'Signed Out',
                'You have been successfully signed out',
                'info',
                3000
            );
        }

        // Redirect to login after brief delay
        setTimeout(() => {
            this.showLogin();
        }, 1000);
    }

    updateUI() {
        // Update user profile sections
        const userProfiles = document.querySelectorAll('.user-profile, [data-user-profile]');
        const loginButtons = document.querySelectorAll('[data-action="show-login"]');
        const logoutButtons = document.querySelectorAll('[data-action="logout"]');

        if (this.isAuthenticated) {
            // Update user profile displays
            userProfiles.forEach(profile => {
                const nameElement = profile.querySelector('.user-name');
                const studioElement = profile.querySelector('.studio-name');
                const initialsElement = profile.querySelector('.user-initials');

                if (nameElement) nameElement.textContent = this.currentUser.name;
                if (studioElement) studioElement.textContent = this.currentUser.studio;
                if (initialsElement) initialsElement.textContent = this.currentUser.initials;
            });

            // Show/hide appropriate buttons
            loginButtons.forEach(btn => btn.style.display = 'none');
            logoutButtons.forEach(btn => btn.style.display = 'block');

            // Update existing user displays
            document.querySelectorAll('.text-white:contains("Uxbridge Dance Academy")').forEach(el => {
                if (el.textContent.includes('Uxbridge Dance Academy')) {
                    el.textContent = this.currentUser.studio;
                }
            });

            document.querySelectorAll('.text-white:contains("Emily Einsmann"), .text-gray-300:contains("Emily Einsmann")').forEach(el => {
                if (el.textContent.includes('Emily Einsmann')) {
                    el.textContent = this.currentUser.name;
                }
            });

        } else {
            // Show login prompt
            loginButtons.forEach(btn => btn.style.display = 'block');
            logoutButtons.forEach(btn => btn.style.display = 'none');
        }
    }

    extractNameFromEmail(email) {
        const name = email.split('@')[0];
        return name.split('.').map(part =>
            part.charAt(0).toUpperCase() + part.slice(1)
        ).join(' ');
    }

    getInitials(email) {
        const name = this.extractNameFromEmail(email);
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 3);
    }

    showLoginError(message) {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('login-loading').classList.add('hidden');

        if (window.NotificationSystem) {
            window.NotificationSystem.show('Login Failed', message, 'error', 5000);
        } else {
            alert(message);
        }
    }

    // Public methods for external use
    requireAuth() {
        if (!this.isAuthenticated) {
            this.showLogin();
            return false;
        }
        return true;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }
}

// Initialize auth system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();

    // Add login button to pages that don't have user profiles
    if (!document.querySelector('.user-profile, [data-user-profile]') && !window.authSystem.isLoggedIn()) {
        const nav = document.querySelector('nav');
        if (nav && !document.getElementById('login-button')) {
            const loginBtn = document.createElement('button');
            loginBtn.id = 'login-button';
            loginBtn.className = 'bg-gradient-to-r from-dance-purple to-dance-pink text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all';
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
            loginBtn.setAttribute('data-action', 'show-login');
            loginBtn.onclick = () => window.authSystem.showLogin();

            // Add to nav
            const navContainer = nav.querySelector('.flex.justify-between');
            if (navContainer) {
                navContainer.appendChild(loginBtn);
            }
        }
    }
});

// Global convenience function
window.showLogin = () => window.authSystem?.showLogin();