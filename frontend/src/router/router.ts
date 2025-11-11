import { HomePage } from '../pages/home';
import { LoginPage } from '../pages/login';
import { PlayPage } from '../pages/play';
import { TournamentPage } from '../pages/tournament';

interface Route {
  path: string;
  render: () => string;
}

const routes: Record<string, Route> = {
  home: {
    path: '/',
    render: HomePage
  },
  login: {
    path: '/login',
    render: LoginPage
  },
  play: {
    path: '/play',
    render: PlayPage
  },
  tournament: {
    path: '/tournament',
    render: TournamentPage
  }
};

class Router {
  private currentRoute: string = 'home';

  init() {
    this.handleRoute();
  }

  navigate(route: string) {
    this.currentRoute = route;
    window.history.pushState({}, '', routes[route]?.path || '/');
    this.handleRoute();
  }

  handleRoute() {
    const route = routes[this.currentRoute];
    if (route) {
      this.render(route);
    } else {
      // 404 page
      this.render404();
    }
  }

  render(route: Route) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = route.render();
    }
  }

  render404() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="container">
          <h1>404 - Page Not Found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <a href="#" data-route="home">Go Home</a>
        </div>
      `;
    }
  }
}

export const router = new Router();
