# Roadmap and initial idea

## Overview

Kick-off planning for the ft_transcendence project following the 42 subject requirements. This issue will gather recommendations for module selection, establish priorities, and outline the initial roadmap for development.

### Module Selection

- **Required Modules:** At least 7 major modules are needed for 100% completion. More modules to get bonus.
- Modules for Bonus: 9.5 major modules
- **Early Development:**
  1. **Game Core (Mandatory, Pong Implementation):** Base functionality, local play, matchmaking, tournament logic, alias registration.
  2. **Backend Framework (Major):** Fastify with Node.js – Enables scalable backend and future module integrations.
  3. **Database Integration (Minor):** SQLite – Used for persistence, user management, match history, scores.
  4. **Front-End Framework (Minor):** Tailwind CSS with Typescript – Ensures frontend consistency and compliance.
  5. **User Management (Major):** Registration, login, alias selection, avatars, friends, stats, match history.
  6. **Remote Players (Major):** Enable online multiplayer, network sync, match logic.

- **Bonus & Expansion Modules:**
  - OAuth Remote Authentication
  - Cybersecurity HTTPS, form validation, password hashing, SQLi/XSS protection, JWT/2FA optional.
  - Blockchain Score Storage (Avalanche/Smart Contracts)
  - Multiple Players (3+)
  - New Game + Matchmaking
  - Game Customization
  - Live Chat
  - AI Opponent
  - Stats Dashboards
  - DevOps (ELK, Prometheus/Grafana, Microservices)
  - Advanced 3D Graphics (Babylon.js)
  - GDPR/Account Deletion

### Suggested Initial Roadmap (Parallelizable)

### Module Overview & Classification

#### **Phase 1: Core & Infrastructure**

- [ ] **Microservices Backend (Major):** Modular backend architecture
- [ ] **Pong Game Core (Mandatory):** Local play, matchmaking, alias registration (*Mandatory*)
- [ ] **Server-Side Pong & API (Major):** Server-side game, API endpoints
- [ ] **Backend Framework: Fastify/Node.js (Major)**
- [ ] **Database: SQLite (Minor)**
- [ ] **Frontend: Tailwind CSS + Typescript (Minor)**
- [ ] **User Management (Major):** Registration, login, profile, avatars, friends, stats, match history
- [ ] **OAuth Remote Authentication (Major)**
- [ ] **Remote Players (Major):** Online multiplayer, network sync

#### **Phase 2: mandatory features we need on top

- [ ] **Tournament & Matchmaking Logic (Mandatory/Minor)**
- [ ] **one keyboard game** (Mandatory)
- [ ] **guest login**
- [ ] **Security Hardening:** HTTPS, validation, password hashing, SQLi/XSS prevention

#### **Phase 3: Bonus & Expansion Modules**

- [ ] **Multiple Players (Major):** 3+ players, new board logic
- [ ] **Game Customization (Minor):** Power-ups, attacks, maps, settings UI
- [ ] **Live Chat (Major):** Direct messages, block, invite, notifications, profile access
- [ ] **AI Opponent (Major):** Keyboard-simulating AI, game logic, power-up support
- [ ] **Stats Dashboards (Minor):** User/game statistics, charts, history
- [ ] **Advanced Graphics (Babylon.js) (Major):** 3D visuals
- [ ] **Blockchain Score Storage (Major):** Avalanche, Solidity smart contracts
- [ ] **DevOps (ELK Stack) (Major):** Log management, Elasticsearch, Logstash, Kibana
- [ ] **WAF Mod Security (Major)**
- [ ] **GDPR/Account Deletion (Minor):** Data anonymization, deletion, local management
- [ ] **2FA JWT two factor auth** (Major)

#### Modules we don't want to do

- [ ] **Monitoring (Prometheus/Grafana) (Minor):** Metrics, dashboards, alerts
- [ ] **CLI Pong vs Web Users (Major):** CLI client, API integration, cross-platform play
- [ ] **New Game + Matchmaking (Major):** Distinct from Pong, user history, matchmaking
- [ ] **Accessibility (lots):** Device/browser/language/visual impairment/SSR

### Seperation of work

Lea: backend, front end?
Anton: game?
Damien: Docker?
Harold: SQL?
Kajus: ?
