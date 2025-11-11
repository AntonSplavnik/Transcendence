import { authAPI } from '../api/api';

let currentUser: any = null;

export async function initAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const result = await authAPI.verify();
      if (result.valid) {
        currentUser = result.user;
        updateUserInfo();
      } else {
        logout();
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      logout();
    }
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function isLoggedIn() {
  return currentUser !== null;
}

export function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  updateUserInfo();
  window.location.hash = '#/login';
}

function updateUserInfo() {
  const userInfoElement = document.getElementById('user-info');
  if (userInfoElement) {
    if (currentUser) {
      userInfoElement.innerHTML = `
        <span>Welcome, ${currentUser.username}!</span>
        <button id="logout-btn">Logout</button>
      `;
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
      }
    } else {
      userInfoElement.innerHTML = '<a href="#" data-route="login">Login</a>';
    }
  }
}
