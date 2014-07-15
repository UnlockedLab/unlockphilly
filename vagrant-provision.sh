#!/usr/bin/env bash
# Install some basic tools.
sudo apt-get update
sudo apt-get install -y git
sudo apt-get install -y vim

# Install MongoDB as an Upstart service -- taken from
# http://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Ruby with RVM.
curl -sSL https://get.rvm.io | bash -s stable
source ~/.rvm/scripts/rvm
rvm use --install 2.0.0
