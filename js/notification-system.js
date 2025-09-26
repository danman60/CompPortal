// CompPortal Notification System
// Professional toast notifications with glassmorphism design

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        // Create notifications container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full';
            document.body.appendChild(container);
            this.container = container;
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    show(type, title, message, options = {}) {
        const id = 'notif-' + Date.now();
        const notification = {
            id,
            type,
            title,
            message,
            timestamp: new Date(),
            duration: options.duration || 5000,
            persistent: options.persistent || false,
            action: options.action || null
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        // Auto-remove unless persistent
        if (!notification.persistent) {
            setTimeout(() => {
                this.remove(id);
            }, notification.duration);
        }

        return id;
    }

    renderNotification(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.id = notification.id;

        // Get icon and color scheme based on type
        const config = this.getTypeConfig(notification.type);

        notificationEl.className = `
            notification-item transform transition-all duration-300 ease-in-out
            bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 shadow-lg
            hover:bg-white/15 cursor-pointer
            animate-slide-in-right
        `.replace(/\s+/g, ' ').trim();

        notificationEl.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <div class="h-10 w-10 ${config.bgColor} rounded-lg flex items-center justify-center">
                        <i class="fas ${config.icon} ${config.textColor} text-lg"></i>
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <h4 class="text-sm font-semibold text-white truncate">${notification.title}</h4>
                        <button onclick="notifications.remove('${notification.id}')"
                                class="text-gray-400 hover:text-white ml-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>
                    <p class="text-sm text-gray-300 mt-1 leading-tight">${notification.message}</p>
                    ${notification.action ? `
                        <div class="mt-3">
                            <button onclick="${notification.action.handler}"
                                    class="text-xs font-medium ${config.textColor} hover:underline">
                                ${notification.action.label}
                            </button>
                        </div>
                    ` : ''}
                    <div class="text-xs text-gray-400 mt-2">
                        ${this.formatTime(notification.timestamp)}
                    </div>
                </div>
            </div>
        `;

        // Add click handler for dismissal
        notificationEl.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.remove(notification.id);
            }
        });

        // Insert at the top of the container
        this.container.insertBefore(notificationEl, this.container.firstChild);
    }

    getTypeConfig(type) {
        const configs = {
            success: {
                icon: 'fa-check-circle',
                bgColor: 'bg-green-500/20 border-green-500/30',
                textColor: 'text-green-400'
            },
            error: {
                icon: 'fa-exclamation-circle',
                bgColor: 'bg-red-500/20 border-red-500/30',
                textColor: 'text-red-400'
            },
            warning: {
                icon: 'fa-exclamation-triangle',
                bgColor: 'bg-yellow-500/20 border-yellow-500/30',
                textColor: 'text-yellow-400'
            },
            info: {
                icon: 'fa-info-circle',
                bgColor: 'bg-blue-500/20 border-blue-500/30',
                textColor: 'text-blue-400'
            },
            reservation: {
                icon: 'fa-calendar-check',
                bgColor: 'bg-purple-500/20 border-purple-500/30',
                textColor: 'text-purple-400'
            },
            dancer: {
                icon: 'fa-user-plus',
                bgColor: 'bg-pink-500/20 border-pink-500/30',
                textColor: 'text-pink-400'
            },
            export: {
                icon: 'fa-download',
                bgColor: 'bg-indigo-500/20 border-indigo-500/30',
                textColor: 'text-indigo-400'
            }
        };

        return configs[type] || configs.info;
    }

    remove(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('animate-slide-out-right');
            setTimeout(() => {
                element.remove();
                this.notifications = this.notifications.filter(n => n.id !== id);
            }, 300);
        }
    }

    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification.id);
        });
    }

    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        return timestamp.toLocaleDateString();
    }

    // Convenience methods for common notification types
    success(title, message, options = {}) {
        return this.show('success', title, message, options);
    }

    error(title, message, options = {}) {
        return this.show('error', title, message, options);
    }

    warning(title, message, options = {}) {
        return this.show('warning', title, message, options);
    }

    info(title, message, options = {}) {
        return this.show('info', title, message, options);
    }

    reservation(title, message, options = {}) {
        return this.show('reservation', title, message, options);
    }

    dancer(title, message, options = {}) {
        return this.show('dancer', title, message, options);
    }

    export(title, message, options = {}) {
        return this.show('export', title, message, options);
    }
}

// Animation CSS to be injected
const notificationCSS = `
<style>
@keyframes slide-in-right {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slide-out-right {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out forwards;
}

.animate-slide-out-right {
    animation: slide-out-right 0.3s ease-in forwards;
}

.notification-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

#notification-container {
    pointer-events: none;
}

#notification-container .notification-item {
    pointer-events: auto;
}
</style>
`;

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Inject CSS
    document.head.insertAdjacentHTML('beforeend', notificationCSS);

    // Create global notification instance
    window.notifications = new NotificationSystem();
});

// For environments without window object
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}