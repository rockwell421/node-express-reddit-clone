"use strict";

var bcrypt = require('bcrypt-as-promised');
var HASH_ROUNDS = 10;

// This is a helper function to map a flat post to nested post
function transformPost(post) {
    return {
        id: post.posts_id,
        title: post.posts_title,
        url: post.posts_url,
        createdAt: post.posts_createdAt,
        updatedAt: post.posts_updatedAt,
        voteScore: post.voteScore,
        numUpvotes: post.numUpvotes,
        numDownvotes: post.numDownvotes,

        user: {
            id: post.users_id,
            username: post.users_username,
            createdAt: post.users_createdAt,
            updatedAt: post.users_updatedAt
        },
        subreddit: {
            id: post.subreddits_id,
            name: post.subreddits_name,
            description: post.subreddits_description,
            createdAt: post.subreddits_createdAt,
            updatedAt: post.subreddits_updatedAt
        }
    };
}

class RedditAPI {
    constructor(conn) {
        this.conn = conn;
    }

    /*
    user should have username and password
     */
    createUser(user) {
        /*
         first we have to hash the password. we will learn about hashing next week.
         the goal of hashing is to store a digested version of the password from which
         it is infeasible to recover the original password, but which can still be used
         to assess with great confidence whether a provided password is the correct one or not
         */
        return bcrypt.hash(user.password, HASH_ROUNDS)
        .then(hashedPassword => {
            return this.conn.query('INSERT INTO users (username, password, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())', [user.username, hashedPassword]);
        })
        .then(result => {
            return result.insertId;
        })
        .catch(error => {
            // Special error handling for duplicate entry
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('A user with this username already exists');
            }
            else {
                throw error;
            }
        });
    }

    /*
    post should have userId, title, url, subredditId
     */
    createPost(post) {
        if (!post.subredditId) {
            return Promise.reject(new Error("There is no subreddit id"));
        }

        return this.conn.query(
            `
                INSERT INTO posts (userId, title, url, createdAt, updatedAt, subredditId)
                VALUES (?, ?, ?, NOW(), NOW(), ?)`,
            [post.userId, post.title, post.url, post.subredditId]
        )
        .then(result => {
            return result.insertId;
        });
    }
    
    //3. Modify the RedditAPI.getAllPosts function to accept a subredditId optional parameter. 
    //If this parameter is passed, the SELECT query should be changed to add a WHERE p.subredditId = ?, 
    //and return only posts for that subreddit.

    getAllPosts(subredditId, sortingMethod) {
        subredditId = subredditId || 0; //declare optional parameter subredditId
        sortingMethod = sortingMethod || ""; 
        
        //accept an optional sorting method to accept hot or top
            //if the sorting method is top, then order posts by votescore DESC
                //if sorted by hot, then order posts by votescore/now()-p.createdAt DESC
        
 
        return this.conn.query(
            `
            SELECT
                p.id AS posts_id,
                p.title AS posts_title,
                p.url AS posts_url,
                p.createdAt AS posts_createdAt,
                p.updatedAt AS posts_updatedAt, 
                
                u.id AS users_id,
                u.username AS users_username,
                u.createdAt AS users_createdAt,
                u.updatedAt AS users_updatedAt,
                
                s.id AS subreddits_id,
                s.name AS subreddits_name,
                s.description AS subreddits_description,
                s.createdAt AS subreddits_createdAt,
                s.updatedAt AS subreddits_updatedAt,
                
                COALESCE(SUM(v.voteDirection), 0) AS voteScore,
                SUM(IF(v.voteDirection = 1, 1, 0)) AS numUpvotes,
                SUM(IF(v.voteDirection = -1, 1, 0)) AS numDownvotes
                
            FROM posts p
                JOIN users u ON p.userId = u.id
                JOIN subreddits s ON p.subredditId = s.id
                LEFT JOIN votes v ON p.id = v.postId
                
            ${subredditId ? `WHERE p.subredditId = ?` : `''`} 
            GROUP BY p.id
            
            
            //working on this now
            
            ${sortingMethod ? `
            WHERE sortingMethod = ""
            ORDER BY p.createdAt DESC'` : 
            `WHERE sortingMethod = 'top' ORDER BY voteScore DESC` : 
            `WHERE sortingMethod = 'hot' ORDER BY voteScore/(NOW()-p.createdAt) DESC
            `}
            
            
            ORDER BY p.createdAt DESC
            LIMIT 25`,
            [subredditId]                       //${subredditId ? WHERE is jumping back to a Javascript conditional for Subreddit Id to be either a placeholder(?) or empty value (ternary operator)
        )
        .then(function(posts) {
            //console.log(posts);
            return posts.map(transformPost => {
                return {
                        
                        posts_id: transformPost.posts_id,
                        posts_title: transformPost.posts_title,
                        posts_url: transformPost.posts_url,
                        posts_createdAt: transformPost.posts_createdAt,
                        posts_updatedAt: transformPost.posts_updatedAt,
                        
                        user:{
                            users_id: transformPost.users_id,
                            users_username: transformPost.users_username,
                            users_createdAt: transformPost.users_createdAt,
                            users_updatedAt: transformPost.users_updatedAt
                        },
                        
                        subreddits:{
                            subreddits_id: transformPost.subreddits_id,
                            subreddits_name: transformPost.subreddits_name,
                            subreddits_description: transformPost.subreddits_description,
                            subreddits_createdAt : transformPost.subreddits_createdAt,
                            subreddits_updatedAt: transformPost.subreddits_updatedAt
                        },
                        
                        voteScore: transformPost.voteScore,
                        numUpvotes: transformPost.numUpvotes,
                        numDownvotes: transformPost.numDownvotes
                };
            });
        });
    }

    // Similar to previous function, but retrieves one post by its ID
    

    getSinglePost(postId) {
        return this.conn.query(
            `
            SELECT
                p.id AS posts_id,
                p.title AS posts_title,
                p.url AS posts_url,
                p.createdAt AS posts_createdAt,
                p.updatedAt AS posts_updatedAt, 
                
                u.id AS users_id,
                u.username AS users_username,
                u.createdAt AS users_createdAt,
                u.updatedAt AS users_updatedAt,
                
                s.id AS subreddits_id,
                s.name AS subreddits_name,
                s.description AS subreddits_description,
                s.createdAt AS subreddits_createdAt,
                s.updatedAt AS subreddits_updatedAt,
                
                COALESCE(SUM(v.voteDirection), 0) AS voteScore,
                SUM(IF(v.voteDirection = 1, 1, 0)) AS numUpvotes,
                SUM(IF(v.voteDirection = -1, 1, 0)) AS numDownvotes
                
            FROM posts p
                JOIN users u ON p.userId = u.id
                JOIN subreddits s ON p.subredditId = s.id
                LEFT JOIN votes v ON p.id = v.postId
                
            WHERE p.id = ?`,
            [postId]
        )
        .then(function(posts) {
            if (posts.length === 0) {
                return null;
            }
            else {
                return transformPost(posts[0]);
            }
        });
    }

    /*
    subreddit should have name and optional description
     */
    createSubreddit(subreddit) {
        return this.conn.query(
            `INSERT INTO subreddits (name, description, createdAt, updatedAt)
            VALUES(?, ?, NOW(), NOW())`, [subreddit.name, subreddit.description])
        .then(function(result) {
            return result.insertId;
        })
        .catch(error => {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('A subreddit with this name already exists');
            }
            else {
                throw error;
            }
            
        });
    }

    getAllSubreddits() {
        return this.conn.query(`
            SELECT id, name, description, createdAt, updatedAt
            FROM subreddits ORDER BY createdAt DESC`
        );
    }

    /*
    vote must have postId, userId, voteDirection
     */
    createVote(vote) {
        if (vote.voteDirection !== 1 && vote.voteDirection !== -1 && vote.voteDirection !== 0) {
            return Promise.reject(new Error("voteDirection must be one of -1, 0, 1"));
        }

        return this.conn.query(`
            INSERT INTO votes (postId, userId, voteDirection)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE voteDirection = ?`,
            [vote.postId, vote.userId, vote.voteDirection, vote.voteDirection]
        );

    }

    /*
    comment must have userId, postId, text
     */
    createComment(comment) {
        return this.conn.query(`
            INSERT INTO comments (userId, postId, text, createdAt, updatedAt)
            VALUES (?, ?, ?, NOW(), NOW())`,
            [comment.userId, comment.postId, comment.text]
        )
        .then(result => {
            return result.insertId;
        });
    }

    getCommentsForPost(postId) {
        return this.conn.query(`
            SELECT
                c.id as comments_id,
                c.text as comments_text,
                c.createdAt as comments_createdAt,
                c.updatedAt as comments_updatedAt,
                
                u.id as users_id,
                u.username as users_username
                
            FROM comments c
                JOIN users u ON c.userId = u.id
                
            WHERE c.postId = ?
            ORDER BY c.createdAt DESC
            LIMIT 25`,
            [postId]
        )
        .then(function(results) {
            return results.map(function(result) {
                return {
                    id: result.comments_id,
                    text: result.comments_text,
                    createdAt: result.comments_createdAt,
                    updatedAt: result.comments_updatedAt,

                    user: {
                        id: result.users_id,
                        username: result.users_username
                    }
                };
            });
        });
    }

    checkUserLogin(inputUsername, password) {
        
        return this.conn.query(`
            SELECT * FROM users WHERE users.username =?`, [inputUsername]) //inputUsername is what the user put in
            .then (result => {
                if(!result[0]) {                             //since every name has a unique id, it will be a single object in our database, result[0] represents that object's index, ex: name: 'eddy', pw:'123'
                     throw new Error("Username invalid");
                 } else {
                     return bcrypt.compare(password, result[0].password)
                 
                .then(function(checkPassword){
                    if(checkPassword) {
                        return {
                            username: result[0].username,
                            id: result[0].id,
                            createdAt: result[0].createdAt,
                            updatedAt: result[0].updatedAt
                        };
                    }
                })
                .catch(function(error){
                    throw new Error("Password invalid");
                })
            }
        })
        
    }
    
        


    createUserSession(userId) {         //call userId in the createUserSession function (that's how our database is identifying a user)
        return bcrypt.genSalt(userId)         //use bcrypt.genSalt to generate random string as a promise
        .then(sessionToken => {
            // console.log(sessionToken + "booooooo");
            this.conn.query(`INSERT INTO sessions (userId, token) VALUES (?, ?)`, [userId, sessionToken]); //insert new session token into database using user inputId
            // console.log('testing the party')
            return sessionToken;
        })

    }
       
     
    getUserFromSession(sessionToken) {
        //JOIN sessions on users.id will compare the primary key (id) with the sessions' userId table
        return this.conn.query(`
         SELECT * FROM users
         JOIN sessions ON users.id = sessions.userId    
         WHERE sessions.token =?`, [sessionToken])
         .then((result) => {
             //console.log(result)
            return result[0]
         })
    }
    

    getSubredditByName(name){  //This should make a query to the database, and return a subreddit object that matches 
                                //the given name. If no subreddit was found, the promise should resolve with null.
        //1.make query that returns subreddit object that matches with input "name"
        return this.conn.query(  
            `SELECT *
                FROM subreddits
                WHERE name = ?`,
                [name]
            ).then(subredditArray => {
                //2. if passed - return a subreddit object
                if(subredditArray.length !== 0){
                    return subredditArray[0];
                }
                //3.otherwise the promise resolved with null
                else {          
                    throw new Error('Subreddit does not exists');
                }
            });
    }
}


module.exports = RedditAPI;