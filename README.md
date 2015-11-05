# Unlock Philly

An interactive web application that was prototyped at Apps For Philly Transit
Hackathon. The aim is provide better information about accessibility. E.g
visualize accessibility of stations and services around the stations. The hope
is that the app can be developed and extended significantly to help people of
Philadelphia.

[View it online at http://unlockphilly.com](http://unlockphilly.com).

# Contributors

See https://github.com/UnlockedLab/unlockphilly/wiki/Volunteer-contributors

# Information for developers

UnlockPhilly is a great platform for learning multiple aspects of web
development spanning front-end and back-end skills.

### Contributing
Requirements/features/bugs are tracked here in GitHub under the issues tab.
Here are some guidelines:

1. An accessible website/app is our number one priority. We value all contributions that put user accessibility as the top consideration when creating or modifying user interface elements. See http://www.w3.org/WAI/intro/wcag and for information/examples about accessible forms/controls see http://webaim.org/techniques/forms/controls ; for details of the Evoxlabs accessibility project, see http://evoxlabs.org/
2. If you see something broken on the site, please [file an issue](https://github.com/UnlockedLab/unlockphilly/issues/new)!
3. If you'd like to contribute to the project, 
 * Decide which issue you'd like to work on. Feel free to ask questions by
   making comments on the issue (or better still, join us at our weekly Code
   for Philly meetups.)
 * Fork the repo.
 * Follow our setup instructions below to ensure you have a running local
   version of the app (if you get stuck or anything is unclear, shout, and help
   us make the instructions even clearer!)
 * Create a branch locally (please name it based on the issue you're working
   on.)
 * Make your changes. Don't forget to write helpful commit messages!
 * Create a pull request against the `unlockedlabs` remote and we'll review it
   and merge the changes.
 * Happy coding! Come along to Code for Philly meetups to learn more and meet
   the team.

### Client Tools (and tech/concepts)

* HTML/CSS.
* Javascript ([JQuery](http://jquery.com)).
* [Bootstrap framework](http://getbootstrap.com/2.3.2/index.html) for easy page
  layout and styling.
* [LeafletJS](http://leafletjs.com)/[Mapbox](http://www.mapbox.com) for maps.
* [D3.js](http://d3js.org/) for graphs and visualizations ([example](http://www.unlockphilly.com/station/21532))
* AJAX requests to the server.

### Server/General Tools (and tech/concepts)

* [Ruby](http://www.ruby.org).
* [MongoDB](http://www.mongodb.org) (NoSQL database).
* [Postmark](https://postmarkapp.com/) For transactional email alerting.
* [Twitter API](https://dev.twitter.com/) For posting outage notifications to Twitter.
* [Mapquest Open API](http://open.mapquestapi.com/) for location Geocoding
* [Google Analytics](https://www.google.com/analytics/) for website usage reporting.
* [Sinatra](http://www.sinatrarb.com): a simple Ruby DSL that receives client
  requests, calls 3rd party APIs/MongoDB and returns JSON responses and dynamic
  web pages.
* [ERB](http://www.stuartellis.eu/articles/erb/) (embedded ruby) pages.
* [REST](http://rest.elkstein.org/) for API design.
* [Heroku](https://www.heroku.com) for hosting [the official
  website](http://www.unlockphilly.com), although you can run everything
  locally as described below.

### Setup instructions

##### Using your own machine

* Make sure your machine is running Ruby 2.0.0 or better (and gem/bundler
  toolsets), latest MongoDB, and git.
* Fork this repo and git clone to your local machine.
* Copy the `.env.sample` file to `.env`, and edit the new `.env` file following
  the instructions inside. You will have to sign up with
  [Mapbox](https://www.mapbox.com/signup/),
  [Yelp](https://www.yelp.com/signup?return_url=%2Fdevelopers%2Fgetting_started%2Fapi_access),
  and [Mapquest](http://developer.mapquest.com/) to get the necessary API keys.
* Run `make install` from the root of the project to install all of the
  necessary Gem dependencies.
* Run `make load-data` to load all stations into MongoDB and give a
  result saying how many stations were loaded.
* Run `foreman start`. This will start a local instance of the application running at [http://localhost:5000](http://localhost:5000).


##### Using a Vagrant VM

If you're not on a linux machine, you can use
[Vagrant](http://www.vagrantup.com/) and
[VirtualBox](https://www.virtualbox.org/) to run a virtual machine (VM) with all of
the necessary dependencies (Mongo, Ruby, etc.) already set up. You may also
choose to do this if you want to avoid potential conflicts with programs
already running on your computer (other instances of Mongo, different versions
of Ruby, etc.)

* Install [Vagrant](http://docs.vagrantup.com/v2/installation/index.html) and
  [VirtualBox](https://www.virtualbox.org/wiki/Downloads).
* Fork this repo and git clone into your local machine.
* Copy the `.env.sample` file to `.env`, and edit the new `.env` file following
  the instructions inside. You will have to sign up with
  [Mapbox](https://www.mapbox.com/signup/),
  [Yelp](https://www.yelp.com/signup?return_url=%2Fdevelopers%2Fgetting_started%2Fapi_access),
  and [Mapquest](http://developer.mapquest.com/) to get the necessary API keys.
* Run the following commands to create the VM, log in, and start an instance of
the website.
```bash
user@home-machine: ~/unlockphilly $ vagrant up
user@home-machine: ~/unlockphilly $ vagrant ssh
vagrant@vm: ~ $ cd /unlockphilly
vagrant@vm: ~ $ make install # Install Ruby dependencies
vagrant@vm: ~ $ make load-data # Copy station data into MongoDB, already running.
vagrant@vm: ~ $ foreman start # Visit http://localhost:5000 in your web browser.
```
* Visit [http://localhost:5000](http://localhost:5000) in your web browser.

