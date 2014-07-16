.PHONY: load-data install .env

default: install

install: Gemfile
	bundle install
	gem install dotenv-deployment
	gem install foreman

load-data:
	cd tools/dataloaders && ./load_stations_to_local_mongo.rb

