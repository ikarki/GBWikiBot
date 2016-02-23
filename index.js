// Modules required to run the program
var Twit  = require('twit');
var request = require('request');
var moment = require('moment');
// We also require the config file that contains API keys and tokens.
var config = require('./config.js');
// Get the api key for Giant Bomb api
var gbApiKey = config.gb;
// Initialize new instance of twit with required info from config.
var twitter = new Twit(config.twitter);

// Set the user-agent header for the bot to work.
var headers = {
	'User-Agent': ''
}

// Options for getting the date added for the newest game.
var newestOptions = {
	url: 'http://www.giantbomb.com/api/games/?api_key=' + gbApiKey + '&format=json&sort=date_added:desc&field_list=date_added,name&limit=1',
	method: 'GET',
	headers: headers
}
// Options for getting details on the latest games added to the database. I made an assumption that there will never be more than 10 new games in the set interval.
var checkOptions = {
	url: 'http://www.giantbomb.com/api/games/?api_key=' + gbApiKey + '&format=json&sort=date_added:desc&field_list=name,date_added,original_release_date,site_detail_url&limit=10',
	method: 'GET',
	headers: headers
}

// Variable that tells how many minutes will be waited between checks.
var interval = 2;
var previousTotal = 0;
// Variable that contains the time and date when the last game was added.
var lastAdded = "";
// Function that does a get request and gets the time when the newest game was added to the database.
function getNewest(){
	request(newestOptions, function(error, response, body){
		// If there were no errors and status code is ok
		if(!error && response.statusCode == 200){
			var parsed = JSON.parse(body);
			if(parsed.status_code == 1){
				// Add a new moment to the variable. Using moment.js allows for easy comparison.
				lastAdded = moment(parsed.results[0].date_added);
			}
		}
	});
}
// Get the newest date everytime the program starts.
getNewest();

// Check for new games every interval.
setInterval(function(){
	checkNewGames();
}, interval*60*1000);


function checkNewGames(){
	if(!lastAdded){
		getNewest();
	}
	// Array that collects all the new additions.
	var newAdditions = [];

	// Make a get request that returns all the newest games in the database.
	request(checkOptions, function(error, response, body){
		if(!error && response.statusCode == 200){
			// Parse the returned JSON data
			var parsed = JSON.parse(body);
			// If status code is 1, everything is OK.
			if(parsed.status_code == 1){
				// Loop through all the results until we have found all the new additions.
				for(var i = 0; i < parsed.results.length; i++){
					var newAdded = moment(parsed.results[i].date_added);
					// If current game in newer than previous newest
					if(lastAdded.isBefore(newAdded)){
						newAdditions.push(parsed.results[i]);
					}	
					// If current game is not newer we can break the loop.
					else{
						break;
					}
				}
				// If new additions were found.
				if(newAdditions.length > 0){
					// Set new time for newest addition.
					lastAdded = moment(newAdditions[0].date_added);
					// Loop through the new additions startgin from end.
					for(var j = newAdditions.length-1; j >= 0; j--){
						// Pass the details to the function that will create a tweet.
						createTweet(newAdditions[j]);
					}
				}
			}
		}
	});
}

// Post the message given as parameter to twitter.
function newPost(tweet){
	twitter.post('statuses/update', {status: tweet}, function(err, data, response){});
}

// A function that creates a tweet based on given input.
function createTweet(result){
	// Start the tweet with the name of the game.
	var tweet = result.name + ' was added to the wiki!';
	// Get the original release date of the game
	var originalRelease = result.original_release_date;
	// If there is a orignal release date, convert it to right format and add it to the tweet. If there is no orignal release date, do nothing.
	if(originalRelease){
		tweet += ' Original releas date ' + moment(originalRelease).format('MMM Do YYYY') + '.';
	}
	// Add link to the wiki page.
	tweet += ' ' + result.site_detail_url;
	newPost(tweet);
}