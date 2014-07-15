.PHONY: load-data install .env

default: .env

.env: .env.sample
	cp .env.sample .env

install: Gemfile
	bundle install
	gem install foreman

load-data:
	cd tools/dataloaders && ./load_stations_to_local_mongo.rb

