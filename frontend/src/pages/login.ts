import { authAPI } from '../api/api';
import { router } from '../router/router';

export function LoginPage(): string {
  setTimeout(() => {
    setupLoginForm();
  }, 0);

  return `
    <div class="container login-page">
      <div class="auth-container">
        <h1>Login</h1>

        <form id="login-form">
          <div class="form-group">
            <label for="username">Username or Email</label>
            <input type="text" id="username" name="username" required />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required />
          </div>

          <button type="submit" class="btn btn-primary">Login</button>
          <div id="login-error" class="error-message"></div>
        </form>

        <p class="auth-switch">
          Don't have an account?
          <a href="#" data-route="register">Register</a>
        </p>
      </div>
    </div>
  `;
}

function setupLoginForm() {
  const form = document.getElementById('login-form') as HTMLFormElement;
  const errorDiv = document.getElementById('login-error');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = (document.getElementById('username') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      try {
        const result = await authAPI.login(username, password);

        if (result.success && result.token) {
          localStorage.setItem('token', result.token);
          router.navigate('home');
          window.location.reload(); // Refresh to update auth state
        } else {
          if (errorDiv) {
            errorDiv.textContent = 'Login failed';
          }
        }
      } catch (error: any) {
        if (errorDiv) {
          errorDiv.textContent = error.response?.data?.error || 'Login failed';
        }
      }
    });
  }
}
