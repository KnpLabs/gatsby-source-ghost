.PHONY: install
install:
	docker compose run --rm app yarn install

.PHONY: lint
lint:
	docker compose run --rm app yarn lint

.PHONY: test
test:
	docker compose run --rm app yarn test
