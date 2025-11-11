import { router } from './router/router';
import { initAuth } from './utils/auth';

// Initialize the application
async function init() {
  console.log('🚀 Initializing Transcendence...');

  // Check if user is logged in
  await initAuth();

  // Initialize router
  router.init();

  // Handle navigation
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.hasAttribute('data-route')) {
      e.preventDefault();
      const route = target.getAttribute('data-route');
      if (route) {
        router.navigate(route);
      }
    }
  });

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    router.handleRoute();
  });
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
