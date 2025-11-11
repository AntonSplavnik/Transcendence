import { gameAPI } from '../api/api';

export function TournamentPage(): string {
  setTimeout(() => {
    setupTournamentPage();
  }, 0);

  return `
    <div class="container tournament-page">
      <h1>Tournaments</h1>

      <div class="tournament-actions">
        <h2>Create Tournament</h2>
        <form id="create-tournament-form">
          <div class="form-group">
            <label for="tournament-name">Tournament Name</label>
            <input type="text" id="tournament-name" required />
          </div>

          <div class="form-group">
            <label for="max-players">Max Players</label>
            <select id="max-players">
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8" selected>8</option>
              <option value="16">16</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary">Create Tournament</button>
          <div id="create-error" class="error-message"></div>
        </form>
      </div>

      <div class="tournament-list">
        <h2>Active Tournaments</h2>
        <div id="tournaments">
          <p>Loading tournaments...</p>
        </div>
      </div>
    </div>
  `;
}

function setupTournamentPage() {
  const form = document.getElementById('create-tournament-form') as HTMLFormElement;
  const errorDiv = document.getElementById('create-error');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = (document.getElementById('tournament-name') as HTMLInputElement).value;
      const maxPlayers = parseInt((document.getElementById('max-players') as HTMLSelectElement).value);

      try {
        const result = await gameAPI.createTournament(name, maxPlayers);

        if (result.success) {
          alert(`Tournament "${name}" created! ID: ${result.tournamentId}`);
          form.reset();
        }
      } catch (error: any) {
        if (errorDiv) {
          errorDiv.textContent = error.response?.data?.error || 'Failed to create tournament';
        }
      }
    });
  }
}
