# AutoDownvote

This is a small script designed to automatically downvote (react with a thumbs down emoji) any messages sent by a selected user or users.

To start the script, use

```
$ npm install
$ npm start
```

When run for the first time, the script will ask for Facebook credentials, which will be stored in a file called `credentials.js`. The script will log in using these credentials and cache the login in `appstate.json`. It will then ask for the name of a user or (comma-separated) users to be downvoted, whose information will be stored in `user.js`.

Since all of this information is cached, it will be reused when the script is run again without any further prompts. To change the user(s) being downvoted, simply remove `user.js`, and to force a new login, remove `appstate.json` (the login will be performed with credentials stored in `credentials.js`, so remove this file as well if you would like to change those credentials).
