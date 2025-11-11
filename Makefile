.PHONY: help build up down restart logs clean

help:
	@echo "Available commands:"
	@echo "  make build    - Build all Docker containers"
	@echo "  make up       - Start all services"
	@echo "  make down     - Stop all services"
	@echo "  make restart  - Restart all services"
	@echo "  make logs     - View logs from all services"
	@echo "  make clean    - Remove all containers, volumes, and images"

build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Services are running!"
	@echo "Frontend: http://localhost:8080"
	@echo "Gateway:  http://localhost:3000"

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	docker system prune -f
