var express = require('express');


module.exports = function(myReddit) {
    var authController = express.Router();
    
    authController.get('/login', function(request, response) {
        response.render("login-form");
    });
    
    
 authController.post('/login', function(request, response) {
        //console.log(request.body);

        myReddit.checkUserLogin(request.body.username, request.body.password)   //boots up our server and calls checkUserLogin function
        .then(result => { 
            return myReddit.createUserSession(result.id)    //return the user's session id promise
        })
        .then(token => {                            
        //console.log(token)
            response.cookie('SESSION', token);      //express syntax for storing cookie from the response to the browser
        })
        .then(useless => {                      //bring user back to the home page)
            response.redirect('/')
            
        })            
        .catch(error => { //response.render('error', {error: error})
            response.status(401).send('401 Unauthorized.')
        })
    });
 
   
    authController.get('/signup', function(request, response) {
        response.render('signup-form');
    });
  
    
    authController.post('/signup', function(request, response) {
        myReddit.createUser({
            username: request.body.username,
            password: request.body.password
            }).then(result => {
                response.redirect("/auth/login");
            }); 
        //  response.send();
    });
    
    return authController;
}