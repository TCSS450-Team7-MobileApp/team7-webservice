# tcss-450-labs-base
This is the base Repository for the Node.js web service used in TCSS 450 Labs. 
* `package.json` and `package-lock.json`
    * These files are used to describe dependencies for the project. There are several packages we use for connecting to databases, connecting to our Mail client, etc.
    * Highly recommended reading: https://docs.npmjs.com/files/package.json
* `Procfile`
    * This is used by Heroku on deployment. It defines what command should be run to start the server.
    * Recommended reading: https://devcenter.heroku.com/articles/procfile
    * **NOTE** If you change the name of the .js file from index.js, you will need to update the Procfile accordingly.
* `.gitignore`
    * This file stops certain files from being commited in git, when you run `git add .`. For example, I'm using the vscode text editor, and it has a few files in the .vscode directory that aren't related to the code and therefore shouldn't be committed. 
    * Please avoid committing the `node_modules/` folder that will be created when you run `npm i`. Its a mess of a directory and contains a lot of stuff that's required for node.js to run, but really shouldn't be committed alongside the code