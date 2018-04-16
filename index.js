// Dependencies
const login = require("facebook-chat-api");
const fs = require("fs");
const readline = require("readline");
// Global access variables
let rl;

try {
	// Look for stored appstate first
	login({ "appState": JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, callback);
} catch (e) {
	// If none found (or expired), log in with email/password
	try {
		// Look for stored credentials in a gitignored credentials.js file
		const credentials = require("./credentials");
		logInWithCredentials(credentials);
	} catch (e) {
		// If none found, ask for them
		initPrompt();
		rl.question("What's your Facebook email? ", (email) => {
			rl.question("What's your Facebook password? ", (pass) => {
				// Store credentials for next time
				fs.writeFileSync("credentials.js", `exports.email = "${email}";\nexports.password = "${pass}";`);

				// Pass to the login method (which should store an appstate as well)
				const credentials = require("./credentials");
				logInWithCredentials(credentials);
			});
		});
	}
}

/*
	Takes a credentials object with `email` and `password` fields and logs into the Messenger API.
	
	If successful, it stores an appstate to cache the login and passes off the API object to the callback.
	Otherwise, it will return an error specifying what went wrong and log it to the console.
*/
function logInWithCredentials(credentials, callback = main) {
	login({ "email": credentials.email, "password": credentials.password }, (err, api) => {
		if (err) return console.error(err);

		fs.writeFileSync("appstate.json", JSON.stringify(api.getAppState()));
		callback(api);
	});
}

/*
	Initializes a readline interface and sets up the prompt for future input.

	Returns the readline interface.
*/
function initPrompt() {
	if (!rl) {
		let rlInterface = readline.createInterface({
			"input": process.stdin,
			"output": process.stdout
		});
		rlInterface.setPrompt("> ");
		rl = rlInterface;
	}
}

/*
	Performs a search for the given user asynchronously and returns any match info found if
	successful (or otherwise rejects the promise).
*/
function findUser(user, api) {
	return new Promise((resolve, reject) => {
		api.getUserID(user, (err, data) => {
			if (!err) {
				resolve(data[0]);
			} else {
				reject(new Error("User not found"));
			}
		});
	});
}

/*
	Checks whether a user has been selected for downvoting and loads it if so.

	Otherwise, asks for a user to search for and saves this user for later, then
	begins downvoting.
*/
function getID(api, cb) {
	try {
		// Check for existing user.js
		const userData = fs.readFileSync("users.json");
		const users = JSON.parse(userData);
		cb(users.map(e => e.name), users.map(e => e.id));
	} catch (e) {
		// If none found, ask for a user and save it, then pass back to main
		initPrompt();
		rl.question("Name of user(s) you'd like to downvote? ", async res => {
			const searches = res.split(",");
			let users = [];
			let lostUsers = [];
			for(let i = 0; i < searches.length; i++) {
				const search = searches[i];
				try {
					let user = await findUser(search, api);
					users.push({
						"name": user.name,
						"id": user.userID
					});
				} catch (e) {
					lostUsers.push(search);
					console.log(e);
				}
			}
			if (lostUsers.length > 0) {
				console.log(`The following users could not be found: ${lostUsers.join(", ")}`);
			}
			fs.writeFileSync("users.json", JSON.stringify(users));
			cb(users.map(e => e.name), users.map(e => e.id));
		});
	}
}

/*
	Downvotes the selected user(s).
*/
function main(api) {
	// Use minimal logging from the API
	api.setOptions({ "logLevel": "warn" });

	// Poll for new messages and downvote them if they match the selected user
	getID(api, (names, ids) => {
		console.log(`Downvoting messages from ${names.join("/")}...`);
		api.listen((err, msg) => {
			if (msg.type == "message" && msg.senderID in ids) {
				api.setMessageReaction("👎", msg.messageID);
			}
		});
	});
}