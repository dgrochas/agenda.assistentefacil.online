APP_MODULE=app.main:app
HOST=127.0.0.1
PORT=8000

.PHONY: help install shell run test test-cov format lint check db-upgrade db-downgrade db-revision db-history db-current clean

help:
	@echo "Comandos disponiveis:"
	@echo "  make install   - instala dependencias com poetry"
	@echo "  make shell     - abre shell no ambiente poetry"
	@echo "  make run       - sobe API em modo dev"
	@echo "  make test      - executa testes"
	@echo "  make test-cov  - executa testes com cobertura"
	@echo "  make format    - formata codigo com ruff"
	@echo "  make lint      - valida codigo com ruff"
	@echo "  make check     - roda lint + testes"
	@echo "  make db-upgrade - aplica migrations do alembic"
	@echo "  make db-downgrade - desfaz a ultima migration"
	@echo "  make db-revision - gera migration automatica (MSG='descricao')"
	@echo "  make db-history - mostra historico de revisions"
	@echo "  make db-current - mostra revision atual aplicada"
	@echo "  make clean     - remove caches temporarios"

install:
	poetry install

shell:
	poetry shell

run:
	poetry run uvicorn $(APP_MODULE) --host $(HOST) --port $(PORT) --reload

test:
	poetry run pytest -q

test-cov:
	poetry run pytest --cov=app --cov-report=term-missing

format:
	poetry run ruff format app

lint:
	poetry run ruff check app

check: lint test

db-upgrade:
	poetry run alembic upgrade head

db-downgrade:
	poetry run alembic downgrade -1

db-revision:
	poetry run alembic revision --autogenerate -m "$(MSG)"

db-history:
	poetry run alembic history --verbose

db-current:
	poetry run alembic current

clean:
	rm -rf .pytest_cache .ruff_cache .coverage htmlcov
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
