"use strict";

/**
 * This is an example Express.js middleware showing how to create and validate
 * sessions based on the signed request from Speakap.
 *
 * The middleware works using a create() and a validate() method. The create()
 * method is called for the signed request and always creates a new session.
 * The session object is attached to the req variable and contains a unique
 * session ID. This session ID is exported to the client by including it in the
 * HTML body of the response (this happens outside of the file in this example)
 * The client then takes care to attach a "Session-Token" header to all its XHR
 * requests, which should match the session ID known by the server.
 *
 * The validate() method is installed as Express.js middleware by doing
 * "app.use(sessions.validate);" before handling any XHR requests that should be
 * validated.
 *
 * Note that sessions are persisted in Redis to allow for load-balancing between
 * multiple Node.js instances.
 *
 * We use a Session-Token header instead of cookies to avoid problems with
 * browsers blocking third-party cookies. Because Speakap Applications run
 * inside an iframe hosted by Speakap, any cookies set are treated as
 * third-party cookies. Safari blocks these by default, and Chrome and Firefox
 * provide options to the user to do so.
 */

var uuid = require("node-uuid");
var redis = require("redis");

var config = require("./config"); // exports just a JSON file with our config
var redisClient = redis.createClient(config.redis.port, config.redis.hostname);

var expressSession = require("express-session");
var RedisStore = require("connect-redis")(expressSession);
var sessionStore = new RedisStore({ client: redisClient });

var Speakap = require("./speakap"); // speakap.js from the node directory

var ONE_WEEK = 7 * 24 * 60 * 60 * 1000; // ms

function create(req, res, next) {

    var session = {
        cookie: { maxAge: ONE_WEEK },
        id: uuid.v4(),
        locale: req.body.locale,
        networkId: req.body.networkEID,
        role: req.body.role,
        signedRequest: Speakap.signedRequest(req.body),
        userId: req.body.userEID
    };

    sessionStore.set(session.id, session);

    req.session = session;
}

function validate(req, res, next) {

    sessionStore.get(req.get("Session-Token"), function(error, session) {
        if (error) {
            next(error);
        } else if (session) {
            req.session = session;
        } else {
            next("Invalid Token: " + req.get("Session-Token"));
        }
    });
}

module.exports = {
    create: create,
    validate: validate
};
