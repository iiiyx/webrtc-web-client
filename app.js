//require the express dependency
const express = require('express')
//declare the variable that is going to be linked to express
const app = express()
//variable for feature media
let http = require('http').Server(app);
//where the app will be running
const port = process.env.PORT || 3001;
//configure static hosting for the public folder
app.use(express.static('public'));

http.listen(port, () => {
  console.log('Listening on', port)
});
