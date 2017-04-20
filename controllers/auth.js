var express = require('express');

module.exports = function(myReddit) {
    var authController = express.Router();
    
    authController.get('/login', function(request, response) {
        response.render('login-form.pug');
    });
    
    authController.post('/login', function(request, response) {
        //console.log(request.body);
        myReddit.checkUserLogin(request.body.username, request.body.password)
        .then(result => {                                   //login success
            return myReddit.createUserSession(result.id);   
        })
        .then(sessionId => {                            //set a cookie for user login
            response.cookie('SESSION', sessionId);          
        })
        .then(reDirect => {
            response.redirect('/');                     //back to homepage
        })
        .catch(error => {                               //login unsuccessful
            response.status(401).send('401 Unauthorized');
        });
        
    });
    
    authController.get('/signup', function(request, response) {
        response.render('signup-form');                             
    });
    
    authController.post('/signup', function(request, response) {
        myReddit.createUser(request.body)
        .then(response.redirect('/auth/login')
        );
    });
    
    return authController;
}


//response.render   -- will call the Pug template engine
//response.redirect -- prevents some duplicate form submission