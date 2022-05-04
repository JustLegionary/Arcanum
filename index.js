var session = require('express-session');
var express = require('express')
var bodyParser = require('body-parser')
const app = express()
const port = 8000
var validator = require('express-validator');
const expressSanitizer = require('express-sanitizer');
app.use(session({
    secret: 'somerandomstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 7200000
    }
}));
app.use(expressSanitizer());


app.use(bodyParser.urlencoded({ extended: true }))
var path = require('path');
// require('./src/main')(app);
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')))
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
var MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
var client;
MongoClient.connect("mongodb+srv://mwhit006:Iloveu2cluster@arcanumcluster.nqqqe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", async function(err, database) {
    if (err) throw err;
    client = database;

    // Start the application after the database connection is ready
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
    console.log("Listening on port 8000");
});


//Helpfull functions
const { check, validationResult } = require('express-validator');
const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/login')
    } else { next(); }
}
const checkPostcodeSession = (req, res, next) => {
    if (!req.session.postcode) {
        res.redirect('./')
    } else { next(); }
}
const checkLogin = (req) => {
        if (!req.session.userId) {
            return false;
        } else {
            return true;
        }
    }
    //Index route
app.get('/', (req, res) => {
    res.render('index.ejs', { session: req.session, errorMessage: false });
})

//Login route
app.get('/login', function(req, res) {
    res.render("login.ejs", { session: req.session });
});
//Loggedin - check the inputted user details against userAccounts collection
//If the user is found and login cridentials are correct a new session is started
//if the login cridentials are incorrect it redirects to /
app.post('/loggedin', check('email').isEmail(), check('password').isLength({ min: 8 }), async function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.send({ displayMessage: { type: "Warn", message: "Incorrect username or password. Please try again." } });
    } else {
        var userDB = client.db('Users');
        var dbCollection = userDB.collection('userAccounts');
        const bcrypt = require('bcrypt');
        const plainPassword = req.body.password;
        const inputEmail = req.body.email;
        dbCollection.findOne({
            email: {
                $regex: new RegExp(inputEmail, 'i')
            }
        }, function(findErr, user) {
            try {
                if (findErr || user == null) {
                    res.send({ displayMessage: { type: "Warn", message: "Incorrect username or password. Please try again." } });
                } else {
                    bcrypt.compare(plainPassword, user.password, function(err, result) {
                        if (err) throw err;
                        if (result) {
                            req.session.mongoUserId = user._id;
                            req.session.userId = user.email;
                            req.session.firstName = user.firstName;
                            req.session.lastName = user.lastName;
                            res.send({ displayMessage: { type: "Success" } });

                        } else {
                            res.send({ displayMessage: { type: "Warn", message: "Incorrect username or password. Please try again." } });

                        }
                    });
                }
            } catch (e) {
                res.send({ displayMessage: { type: "Error", message: "An error occured, please try again later." } });
            }
        });
    }
});


//Logout - end the user session 
app.get('/logout', redirectLogin, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('./')
        }
        res.redirect('./');
    })
})

//Register Route
app.get('/register', function(req, res) {
    res.render("register.ejs", { session: req.session });
});
//Registered - takes the user register form, checks the email and password are valid
//if they are valid it checks if there is already someone in the DB with either their email or username
//if they are a unqiue user it registers them in the DB and always redirects to login
app.post('/registered', check('email').isEmail(), check('password').isLength({ min: 8 }), async function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        res.send({ displayMessage: { type: "Error", message: "An error occured, please try again later." } });
    } else {
        if (req.body.password != req.body.passwordVeryify) {
            res.send({ displayMessage: { type: "Error", message: "Passwords do not match." } });
        }
        var db = client.db('Users');
        var inputEmail = req.body.email;
        var inputUsername = req.body.username;
        var emailAlreadyInUse = await db.collection('userAccounts').findOne({ "email": inputEmail });
        var usernameAlreadyInUse = await db.collection('userAccounts').findOne({ "username": inputUsername });
        if (!emailAlreadyInUse && !usernameAlreadyInUse) {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const plainPassword = req.sanitize(req.body.password);
            var hashedPassword;
            try {
                bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {

                    // Store hashed password in your database.
                    db.collection('userAccounts').insertOne({
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        password: hashedPassword,
                        email: req.body.email,
                        username: req.body.username,
                        likedPosts: [],
                        groupsCreated: [],
                        groupsJoined: []
                    });
                })
                res.send({ displayMessage: { type: "Success" } });
            } catch { e } {
                res.send({ displayMessage: { type: "Error", message: "An error occured, please try again later." } });
            }

        } else if (emailAlreadyInUse) {
            res.send({ displayMessage: { type: "Warn", message: "The email entered is already in use. Login or use a different email." } })
        } else {
            res.send({ displayMessage: { type: "Warn", message: "The username entered is already in use. Login or use a different username." } })
        }
    }
});

//Group routes
app.get('/createGroup', function(req, res) {
    res.render("createGroup.ejs", { session: req.session });
});
//Create group
app.post('/createGroupRequest', function(req, res) {
    var postCode = req.body.groupPostcode;
    postCode = postCode.replace(/ /g, '');
    const request = require('request');
    let postcodeData = `http://api.postcodes.io/postcodes/${postCode}`
    request(postcodeData, function(err, response, postcodeRes) {
        if (err) {
            console.log('error:', error);
            res.redirect('/');
        } else {
            postcodeRes = JSON.parse(postcodeRes);
            const long = postcodeRes.result.longitude;
            const lat = postcodeRes.result.latitude;
            const userGroupsdb = client.db('userCollections');
            const createGroupCollection = userGroupsdb.collection('Collection');
            createGroupCollection.insertOne({
                title: req.body.groupName,
                numOfMembers: 0,
                groupOwner: {
                    id: ObjectID(req.session.mongoUserId),
                    username: req.session.userId
                },
                category: req.body.categorySelector,
                description: req.body.groupDescription,
                location: {
                    type: "Point",
                    coordinates: [long, lat]
                }
            }, function(err, docsInserted) {
                const accountsdb = client.db('Users');
                const userAccountsCollection = accountsdb.collection('userAccounts');
                userAccountsCollection.updateOne({ "_id": ObjectID(req.session.mongoUserId) }, { $push: { "groupsCreated": { "groupID": docsInserted.insertedId, "groupTitle": req.body.groupName } } })
            })
            req.session.currentGroup = req.body.groupName;
            res.redirect(307, `/joinGroup/${req.body.groupName}`);
        }
    })
});
//users user input from index page for group lookup
app.post('/groupList', function(req, res) {
    req.session.postcode = req.body.postcode;
    returnGroupData(req, res, req.body.postcode, checkLogin(req));
});
//users session.userpost code to get postcode for group lookup
app.get('/groupList', function(req, res) {
    if (!req.session.postcode) {
        res.redirect('/')
    } else {
        returnGroupData(req, res, req.session.postcode, checkLogin(req));
    }
});



//Display group page
app.get('/group/:groupName', redirectLogin, (req, res) => {
    req.session.currentGroup = req.params.groupName;
    console.log('Connected to Database')
    const groupdb = client.db('userCollections')
    const groupsPostsCollection = groupdb.collection('groupPosts')
    const eventCollection = groupdb.collection('groupEvents')
    const groupsCollection = groupdb.collection('groups')
    const userdb = client.db('Users')
    const userAccountCollection = userdb.collection('userAccounts')
    var groupName = req.params.groupName;
    groupName = groupName.replace(/-/g, ' ');
    groupsCollection.findOne({ "title": groupName }, function(err, groupRes) {
        if (groupRes) {
            userAccountCollection.findOne({ "_id": ObjectID(req.session.mongoUserId) }, function(err, userResults) {
                if (err) return console.error(err);
                // userResults = JSON.parse(userResults);
                var renderFile = 'restrictedGroup.ejs';
                var groupsJoinedArray = userResults.groupsJoined;
                for (var i = 0; i < groupsJoinedArray.length; i++) {
                    if (groupsJoinedArray[i].groupTitle == groupName) {
                        renderFile = 'group.ejs';
                        break;
                    }
                }
                groupsPostsCollection.find({ groupTitle: groupName }).toArray(function(err, postResults) {
                    if (err) return console.error(err);
                    eventCollection.find({ groupTitle: groupName }).toArray().then(eventResults => {
                        res.render(renderFile, { group: groupName, posts: postResults, events: eventResults, session: req.session })
                    })
                })
            })
        } else {
            res.redirect(303, '/groupList');
        }
    })
});
//Join groupe
app.post('/joinGroup/:groupName', (req, res) => {
    const groupName = req.session.currentGroup.replace(/-/g, ' ');
    const groupdb = client.db('userGroups')
    const userdb = client.db('Users')
    groupdb.collection('groups').findOne({ "title": groupName }, function(err, groupRes) {
        const groupID = groupRes._id;
        console.log(groupID);
        userdb.collection('userAccounts').updateOne({ "_id": ObjectID(req.session.mongoUserId) }, { $push: { "groupsJoined": { "groupID": ObjectID(groupID), "groupTitle": groupName } } })
        groupdb.collection('groups').updateOne({ "_id": ObjectID(groupID) }, { $push: { "groupMembers": req.session.userId } });
        res.redirect(303, `/group/${groupName}`);
    });
});
//Leave groupe
app.post('/leaveGroup/:groupName', (req, res) => {
    const groupName = req.session.currentGroup.replace(/-/g, ' ');
    const groupdb = client.db('userGroups')
    const userdb = client.db('Users')
    groupdb.collection('groups').findOne({ "title": groupName }, function(err, groupRes) {
        const groupID = groupRes._id;
        console.log(groupID);
        userdb.collection('userAccounts').updateOne({ "_id": ObjectID(req.session.mongoUserId) }, { $pull: { "groupsJoined": { "groupID": ObjectID(groupID) } } })
        groupdb.collection('groups').updateOne({ "_id": ObjectID(groupID) }, { $pull: { "groupMembers": req.session.userId } });
        res.redirect(303, `/group/${groupName}`);
    });

})

//Post routes
//Create Post route POST

//To-Do compleate the grouppost form and post to DB
app.post('/post/newPost', function(req, res) {
    const groupTitle = req.session.currentGroup.replace(/-/g, ' ');
    const postTitle = req.body.newPostTitle;
    const postText = req.body.newPostText;
    const db = client.db('userGroups')
    const groupsCollection = db.collection('groupPosts')
    groupsCollection.insertOne({
        groupTitle: groupTitle,
        postTitle: postTitle,
        postText: postText,
        likedBy: [],
        author: { username: req.session.userId, id: ObjectID(req.session.mongoUserId), name: (req.session.firstName + " " + req.session.lastName) }
    }).then(res.redirect(303, `/group/${groupTitle}`));
});

//GET single post 
app.get('/post/:postTitle', function(req, res) {
    const postTitle = req.params.postTitle;
    const db = client.db('userGroups')
    const groupsCollection = db.collection('groupPosts')
    groupsCollection.findOne({ "postTitle": postTitle }, function(err, postRes) {
        if (err) return console.error(err)
        res.render('post.ejs', { postData: postRes, session: req.session })
    })
});


//Delete Post route DELETE
//Edit Post route PUT


//Like group post
app.put('/group/likePost', (req, res) => {
        if (!req.session.userId) {
            res.status(200).send({
                status: 'failed',
                message: 'no userId'
            })
        } else {
            const postID = req.body.postID;
            const postTitle = req.body.postTitle;
            const groupdb = client.db('userGroups')
            const userdb = client.db('Users')
            userdb.collection('userAccounts').updateOne({ "_id": ObjectID(req.session.mongoUserId) }, { $push: { "likedPosts": { "postID": ObjectID(postID), "postTitle": postTitle } } })
            groupdb.collection('groupPosts').updateOne({ "_id": ObjectID(postID) }, { $push: { "likedBy": req.session.userId } })
            res.status(200).send({
                status: 'success',
                message: 'post found and liked'
            })

        }
    })
    //Unlike group Post
app.put('/group/unlikePost', (req, res) => {
        if (!req.session.userId) {
            res.status(200).send({
                status: 'failed',
                message: 'no userId'
            })
        } else {
            const postID = req.body.postID;
            const groupdb = client.db('userGroups')
            const userdb = client.db('Users')
            userdb.collection('userAccounts').updateOne({ "_id": ObjectID(req.session.mongoUserId) }, { $pull: { "likedPosts": { "postID": ObjectID(postID) } } })
            groupdb.collection('groupPosts').updateOne({ "_id": ObjectID(postID) }, { $pull: { "likedBy": req.session.userId } })
            res.status(200).send({
                status: 'success',
                message: 'post found and liked'
            })

        }
    })
    //Display my account
app.get('/myaccount', redirectLogin, function(req, res) {
    console.log('Connected to Database')
    const db = client.db('Users')
    const DBCollection = db.collection('userAccounts')
    DBCollection.findOne({ "_id": ObjectID(req.session.mongoUserId) }, function(err, user) {
        if (err || user == null) {
            res.send("An error occurred");
        } else {
            res.render("myAccount.ejs", { userAccount: user, session: req.session });
        }
    })
});




function returnGroupData(req, res, postCode, userLoggedIn) {
    const request = require('request');
    let postcodeData = `http://api.postcodes.io/postcodes/${postCode}`
    request(postcodeData, async function(err, response, postcodeRes) {
        if (err) {
            console.log('error:', err);
            res.redirect('./');
        } else {
            postcodeRes = JSON.parse(postcodeRes);
            const long = postcodeRes.result.longitude;
            const lat = postcodeRes.result.latitude;
            const db = client.db('userGroups')
            const groupsCollection = db.collection('groups')
            await groupsCollection.aggregate([{
                $geoNear: {
                    near: { type: "Point", coordinates: [long, lat] },
                    distanceField: "dist.calculated"
                }
            }]).toArray(function(err, postResults) {
                if ((!req.session.userId) && (postResults.length > 5)) {
                    postResults.length = 5;
                }
                return res.render('groupList.ejs', { groups: postResults, session: req.session });
            });
        }
    });
}