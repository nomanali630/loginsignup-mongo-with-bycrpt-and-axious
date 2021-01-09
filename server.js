var express = require("express")
var cors = require("cors")
var morgan = require("morgan")
var bodyParser = require("body-parser")
var mongoose = require("mongoose")
var bcrypt = require("bcrypt-inzi")
var jwt = require("jsonwebtoken");


var SERVER_SECRET = process.env.SECRET || "1234";

let dbURI = "mongodb+srv://nomanali:03112515630@cluster0.03qvu.mongodb.net/first?retryWrites=true&w=majority";

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on("connected", function () {
    console.log("mongoose is connected");
});
mongoose.connection.on("disconnected", function () {
    console.log("mongoose is disconnected");
    process.exit(1);
});
mongoose.connection.on("error", function (err) {
    console.log("mongoose connection error", err);
});
process.on("SIGINT", function () {
    console.log("app is terminating");
    mongoose.connection.close(function () {
        console.log("mongoose default connection close");
        process.close(0);
    });
});
var userSchema = new mongoose.Schema({
    "name": String,
    "email": String,
    "password": String,
    "phone": String,
    "gender": String,
    "createdOn": { "type": Date, "default": Date.now },
    "activeSince": Date,
});
var userModel = mongoose.model("users", userSchema);

var app = express();
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());

app.post("/signup", function (req, res, next) {
    if (!req.body.name || !req.body.email
        || !req.body.password || !req.body.gender) {
        res.status(403).send(`
           please send name ,email ,password, gender and phone in json body.
            {
                name:noman ali,
                email:hussainkhaan78@gmail.com,
                password:123,
                gender: male,
           }`)
        return;
    }
    userModel.findOne({ email: req.body.email },
        function (err, data) {
            if (!err && !data) {
                bcrypt.StringToHash(req.body.password).then(function (pyaraPass) {
                    var newUser = new userModel({
                        "name": req.body.name,
                        "email": req.body.email,
                        "password": pyaraPass,
                        "phone": req.body.phone,
                        "gender": req.body.gender

                    });
                    newUser.save(function (err, data) {
                        if (!err) {
                            res.send({
                                message: "user agaya"
                            })
                        } else {
                            console.log(err);
                            res.status(500).send({
                                message: "user ne create kiya error " + err
                            });
                        }
                    })
                })
            } else if (err) {
                res.status(500).send({
                    message: "database error"
                })
            } else {
                res.status(409).send({
                    message: "user pehly se mojude hai"
                });
            }
        }



    )
});

app.post("/login", function (req, res, next) {
    if (!req.body.password || !req.body.email) {
        res.status(403).send(`
        please provide email and password in json body
        {
            "email": "hussainkhaan78@gmail.com",
            "password":"123"
        }`)
        return;
    }
    userModel.findOne({ email: req.body.email },
        function (err, user) {
            if (err) {
                res.status(500).send({
                    message: "an error occured" + JSON.stringify(err)
                });
            } else if (user) {
                bcrypt.verifyHash(req.body.password, user.password).then(isMatched => {
                    if (isMatched) {
                        console.log("matched");
                        var token = jwt.sign({
                            id: user._id,
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            gender: user.gender,
                            ip: req.socket.remoteAddress
                        }, SERVER_SECRET)
                        res.send({
                            message: "login success",
                            user: {
                                name: user.name,
                                email: user.email,
                                phone: user.phone,
                                gender: user.gender,
                            },
                            token: token
                        });
                    } else {
                        res.status(401).send({
                            message: "incorrect password"
                        })
                    }
                }).catch(e => {
                    console.log("error: ", e)
                });
            } else {
                res.status(403).send({
                    message: "user not found"
                });
            };
        });
});

app.get("/profile", function (req, res, next) {
    if (!req.headers.token) {
        res.status(403).send(
            `please provide token in header
            {
                "token":"hhdjhukenihe 989898989"
            }`
        )
        return;
    }
    var decodedData = jwt.verify(req.headers.token, SERVER_SECRET);
    console.log("user: ", decodedData)

    userModel.findById(decodedData.id, 'name email phone gender createdOn',
        function (err, doc) {

            if (!err) {

                res.send({
                    profile: doc
                })
            } else {
                res.status(500).send({
                    message: "server error"
                })
            }

        })
})

var PORT = process.env.PORT || 5000;

app.listen(PORT, function () {
    console.log("server is running on " + PORT);
})