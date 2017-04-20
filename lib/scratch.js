//Scatchpad

var mysql = require('promise-mysql');
var RedditAPI = require('./lib/reddit.js');
var connection = mysql.createPool({
    user: 'root',
    database: 'reddit'
});
var myReddit = new RedditAPI(connection);


// app.get('/posts', (req, res) => {

//   myReddit.getAllPosts()
//     .then(allPosts => {
//       res.render('post-list', {allPosts: allPosts});
      
//     });
// });