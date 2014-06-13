Unlock Philly
====

An interactive web application that was prototyped at Apps For Philly Transit Hackathon.  The aim is provide better information about accessibility. E.g visualize accessibility of stations and services around the stations. The hope is that the app can be developed and extended significantly to help people of Philadelphia.

/views/unlock_philadelphia.erb (and related JS - see HTML inside ERB for paths etc)

View it online at http://unlockphilly.com

Information for developers
====

Unlockphilly is a great platform for learning multiple aspects of web development spanning front-end and back-end skills.

Requirements/features/bugs are tracked here in GitHub under the issues tab.  Here are some guidelines:-

1. If you see something broken on the site, please raise a bug.
2. If you'd like to contribute to the project, 
 * Decide which issue you'd like to work on. Feel free to ask questions by making comments on the issue (or better still, join us at our weekly Code for Philly meetups)
 * Fork the repo
 * Follow our setup instructions below to ensure you have a running local version of the app (if you get stuck or anything is unclear, shout, and help us make the instructions even clearer!)
 * Create a branch locally (please name it based on the issue you're working on)
 * Make your changes and give helpful commit messages
 * Make a pull request against the 'unlockedlabs' remote and we'll review it and merge the changes
 * Happy coding! Come along to Code for Philly meetups to learn more and meet the team.

**Client Techology**
* JQuery - http://jquery.com
* HTML/CSS
* Bootstrap frameework - makes it easy to lay out a web page and has many useful styling features out of the box that are fully customizable. See:- http://getbootstrap.com/2.3.2/index.html
* Mapping development is supported the LeafletJS/Mapbox libraries - http://leafletjs.com - http://www.mapbox.com
* D3 Javascript library is used to provide graphs/visualizations (see the station outages graphs by clicking 'more...' on station popup)

**Server-side Technology/Concepts used by the app**
* Ruby - http://www.ruby.org
* Sinatra - a simple Ruby DSL that receives client requests, calls 3rd party APIs/MongoDB and returns JSON responses and dynamic web pages - http://www.sinatrarb.com
* ERB (embedded ruby) pages.
* REST 
* AJAX requests also made to server
* MongoDB (NoSQL database) - http://www.mongodb.org

Everything is hosted in Heroku - https://www.heroku.com ... but you should be able to run everything locally.

Setup instructions
====

* Ensure Ruby 2.0.0 or better (and gem/bundler toolsets), latest MongoDB, and git are installed on your machine.
* Fork this repo and git clone into your local machine. (knowledge of git/github is assumed)
* Rename the .env.sample file to .env
* Edit the .env file you just renamed following the instruction inside the file. Your own Mapbox, Yelp and Mapquest accounts/keys are required, you'll need to visit the websites and create accounts.
* Start up MongoDB using the 'mongod' command in a terminal window.
* Run 'bundle install' from the root of the project to get all necessary Gems.
* Go to (cd into) the tools/dataloaders and run 'ruby load_stations_to_local_mongo.rb' (this should load all stations into Mongo and give a result saying how many stations were loaded)
* Run 'gem install foreman'
* Go back to the project root and run 'foreman start'. This should start the app at http://localhost:5000


