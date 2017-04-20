"use strict";

var bcrypt = require('bcrypt-as-promised');

getSubredditByName(name){  //This should make a query to the database, and return a subreddit object that matches 
                                //the given name. If no subreddit was found, the promise should resolve with null.
        return this.conn.query(  //1.make query that returns subreddit object that matches with input "name"
            `SELECT *
                FROM subreddits
                WHERE name = ?`,
                [name]
            ).then(result => {
                if(result){
                   //console.log(result);//if condition passed return a subreddit object
                   return {
                        id: result.id,
                        name: result.name,
                        description: result.description,
                        createdAt: result.createdAt,
                        updatedAt: result.updatedAt
                   }
                } 
                else {          //otherwise the promise resolved with null
                    Promise.resolve(null);
                }
        });
}