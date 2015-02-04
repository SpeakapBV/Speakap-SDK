"use strict";

var crypto = require("crypto");
var _ = require("lodash");

var SIGNATURE_WINDOW_SIZE = 60 * 1000; // ms

function percentEncode(string) {

    return encodeURIComponent(string).replace("!", "%21").replace("'", "%27")
                                     .replace("(", "%28").replace(")", "%29")
                                     .replace("*", "%2A");
}

/**
 * Generates the signed request string from the parameters.
 *
 * @param params Object containing POST parameters passed during the signed request.
 *
 * @return Query string containing the parameters of the signed request.
 *
 * Note this method does not calculate a signature; it simply generates the signed request from
 * the parameters including the signature.
 */
function signedRequest(params) {

    var keys = _.without(_.keys(params), "signature");
    keys.sort();
    keys.push("signature");
    return _.map(keys, function(key) {
        return percentEncode(key) + "=" + percentEncode(params[key]);
    }).join("&");
}

/**
 * Validates the signature of a signed request.
 *
 * @param params Object containing POST parameters passed during the signed request.
 * @param appSecret App secret the parameters should've been signed with.
 *
 * Throws an exception if the signature doesn't match or the signed request is expired.
 */
function validateSignature(params, appSecret) {

    var keys = _.keys(params);
    keys.sort();

    var queryString = _.map(_.without(keys, "signature"), function(key) {
        return percentEncode(key) + "=" + percentEncode(params[key]);
    }).join("&");

    var hmac = crypto.createHmac("sha256", appSecret);
    var computedHash = hmac.update(queryString).digest("base64");
    if (computedHash !== params.signature) {
        throw new Error("Invalid signature: " + queryString);
    }

    var issuedAt = new Date(params.issuedAt).getTime();
    if (Date.now() > issuedAt + SIGNATURE_WINDOW_SIZE) {
        throw new Error("Expired signature");
    }
}

/**
 * Speakap API wrapper.
 *
 * You should instantiate the Speakap API as follows:
 *
 *   var Speakap = require("speakap");
 *   var speakapApi = new Speakap.API({
 *       scheme: "https",
 *       hostname: "api.speakap.io",
 *       appId: MY_APP_ID,
 *       appSecret: MY_APP_SECRET,
 *       apiVersion: "1.1"
 *   });
 *
 * Obviously, MY_APP_ID and MY_APP_SECRET should be replaced with your actual App ID and secret (or
 * by constants containing those).
 *
 * After you have instantiated the API wrapper, you can perform API calls as follows:
 *
 *   speakapApi.get("/networks/" + networkId + "/user/" + userId + "/", function(error, result) {
 *       if (error) {
 *           // handle error
 *       } else {
 *           // do something with result
 *       }
 *   });
 *
 *   speakapApi.post("/networks/" + networkId + "/messages/", {
 *       "body": "test 123",
 *       "messageType": "update",
 *       "recipient": { "type": "network", "EID": networkId }
 *   }, function(error, result) {
 *       if (error) {
 *           // handle error
 *       } else {
 *           // do something with result
 *       }
 *   });
 *
 * The result parameter is an already parsed reply in case of success. The error parameter is an
 * object containing code and message properties in case of an error.
 */
function API(config) {

    if (config.scheme !== "http" && config.scheme !== "https") {
        throw new Error("Speakap scheme should be http or https");
    }

    this.scheme = require(config.scheme);
    this.hostname = config.hostname;
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.apiVersion = config.apiVersion || "1.1";

    if (this.appId && this.appSecret) {
        this.accessToken = this.appId + "_" + this.appSecret;
    }
}

_.extend(API.prototype, {

    /**
     * Performs a DELETE request to the Speakap API.
     *
     * @param path The path of the REST endpoint, including optional query parameters.
     * @param options Optional options object. May contain the following properties:
     *                accept - MIME type of the API response to accept. By default, this is
     *                         "application/vnd.speakap.api-v<apiVersion>+json".
     *                accessToken - Access token to use for authorizing the request. By default,
     *                              the access token is based on the App ID and App Secret given
     *                              when initializing the API class.
     * @param callback Optional callback that receives the result of the request. It receives two
     *                 parameters:
     *                 error - Error object with code and message properties if the request failed.
     *                 result - Parsed JSON response.
     *
     * @return A jQuery promise object with is .
     *
     * Example:
     *
     *   speakapApi["delete"]("/networks/" + networkId +
     *                        "/messages/" + messageId + "/", function(error, result) {
     *       if (error) {
     *           // handle error
     *       } else {
     *           // do something with result
     *       }
     *   });
     */
    "delete": function(path, options, callback) {

        this.request("DELETE", path, null, options, callback);
    },

    /**
     * Performs a GET request to the Speakap API.
     *
     * @param path The path of the REST endpoint, including optional query parameters.
     * @param options Optional options object. May contain the following properties:
     *                accept - MIME type of the API response to accept. By default, this is
     *                         "application/vnd.speakap.api-v<apiVersion>+json".
     *                accessToken - Access token to use for authorizing the request. By default,
     *                              the access token is based on the App ID and App Secret given
     *                              when initializing the API class.
     * @param callback Optional callback that receives the result of the request. It receives two
     *                 parameters:
     *                 error - Error object with code and message properties if the request failed.
     *                 result - Parsed JSON response.
     *
     * @return A tuple containing the parsed JSON reply (in case of success) and an error object
     *         (in case of an error).
     *
     * Example:
     *
     *   speakapApi.get("/networks/" + networkId + "/timeline/" +
     *                  "?embed=messages.author", function(error, result) {
     *       if (error) {
     *           // handle error
     *       } else {
     *           // do something with result
     *       }
     *   });
     */
    get: function(path, options, callback) {

        this.request("GET", path, null, options, callback);
    },

    /**
     * Performs a POST request to the Speakap API.
     *
     * @param path The path of the REST endpoint, including optional query parameters.
     * @param data Object representing the JSON object to submit.
     * @param options Optional options object. May contain the following properties:
     *                accept - MIME type of the API response to accept. By default, this is
     *                         "application/vnd.speakap.api-v<apiVersion>+json".
     *                accessToken - Access token to use for authorizing the request. By default,
     *                              the access token is based on the App ID and App Secret given
     *                              when initializing the API class.
     *                contentType - MIME type of the data to submit. By default, this is
     *                              "application/json".
     * @param callback Optional callback that receives the result of the request. It receives two
     *                 parameters:
     *                 error - Error object with code and message properties if the request failed.
     *                 result - Parsed JSON response.
     *
     * @return A tuple containing the parsed JSON reply (in case of success) and an error object
     *         (in case of an error).
     *
     * Note that if you want to make a POST request to an action (generally all REST endpoints
     * without trailing slash), you should use the postAction() method instead, as this will use
     * the proper formatting for the POST data.
     *
     * Example:
     *
     *   speakapApi.post("/networks/" + networkId + "/messages/", {
     *       "body": "test 123",
     *       "messageType": "update",
     *       "recipient": { "type": "network", "EID": networkId }
     *   }, function(error, result) {
     *       if (error) {
     *           // handle error
     *       } else {
     *           // do something with result
     *       }
     *   });
     */
    post: function(path, data, options, callback) {

        this.request("POST", path, JSON.stringify(data), options, callback);
    },

    /**
     * Performs a POST request to an action endpoint in the Speakap API.
     *
     * @param path The path of the REST endpoint, including optional query parameters.
     * @param data Object containing the form parameters to submit. Use null if there is no data to
     *             submit.
     * @param options Optional options object. May contain the following properties:
     *                accept - MIME type of the API response to accept. By default, this is
     *                         "application/vnd.speakap.api-v<apiVersion>+json".
     *                accessToken - Access token to use for authorizing the request. By default,
     *                              the access token is based on the App ID and App Secret given
     *                              when initializing the API class.
     *                contentType - MIME type of the data to submit. By default, this is
     *                              "application/x-www-form-urlencoded".
     * @param callback Optional callback that receives the result of the request. It receives two
     *                 parameters:
     *                 error - Error object with code and message properties if the request failed.
     *                 result - Parsed JSON response.
     *
     * @return A tuple containing the parsed JSON reply (in case of success) and an error object
     *         (in case of an error).
     *
     * Example:
     *
     *   speakapApi.postAction("/networks/" + networkId + "/messages/" + messageId + "/markread"
     *                         null, function(error, result) {
     *       if (error) {
     *           // handle error
     *       } else {
     *           // do something with result
     *       }
     *   });
     */
    postAction: function(path, data, options, callback) {

        if (data) {
            data = _.map(data, function(value, key) {
                return encodeURIComponent(key) + "=" + encodeURIComponent(value);
            }).join("&");
        }

        if (!_.isObject(options) || _.isFunction(options)) {
            callback = options;
            options = {};
        }

        this._request("POST", path, data,
                      _.extend({ contentType: "application/x-www-form-urlencoded" }, options),
                      callback);
    },

    /**
     * Performs a PUT request to the Speakap API.
     *
     * @param path The path of the REST endpoint, including optional query parameters.
     * @param data Object representing the JSON object to submit.
     * @param options Optional options object. May contain the following properties:
     *                accept - MIME type of the API response to accept. By default, this is
     *                         "application/vnd.speakap.api-v<apiVersion>+json".
     *                accessToken - Access token to use for authorizing the request. By default,
     *                              the access token is based on the App ID and App Secret given
     *                              when initializing the API class.
     *                contentType - MIME type of the data to submit. By default, this is
     *                              "application/json".
     * @param callback Optional callback that receives the result of the request. It receives two
     *                 parameters:
     *                 error - Error object with code and message properties if the request failed.
     *                 result - Parsed JSON response.
     *
     * @return A tuple containing the parsed JSON reply (in case of success) and an error object
     *         (in case of an error).
     *
     * Example:
     *
     *   speakapApi.put("/networks/" + networkId + "/messages/" + messageId + "/",
     *                  { commentable: false }, function(error, result) {
     *       if (error) {
     *           // handle error
     *       } else {
     *           // do something with result
     *       }
     *   });
     */
    put: function(path, data, options, callback) {

        this._request("PUT", path, JSON.stringify(data), options, callback);
    },

    /**
     * Performs an HTTP request to the Speakap API.
     *
     * @param method The HTTP method to use, e.g. "POST". See the delete(), get(), post(),
     *               postAction() and put() methods for convenience methods for submitting specific
     *               types of requests.
     * @param path The path of the REST endpoint, including optional query parameters.
     * @param data String containing the data to submit. Use null if there is no data to submit.
     * @param options Optional options object. May contain the following properties:
     *                accept - MIME type of the API response to accept. By default, this is
     *                         "application/vnd.speakap.api-v<apiVersion>+json".
     *                accessToken - Access token to use for authorizing the request. By default,
     *                              the access token is based on the App ID and App Secret given
     *                              when initializing the API class.
     *                contentType - MIME type of the data to submit. By default, this is
     *                              "application/json".
     * @param callback Optional callback that receives the result of the request. It receives two
     *                 parameters:
     *                 error - Error object with code and message properties if the request failed.
     *                 result - Parsed JSON response.
     *
     * @return A tuple containing the parsed JSON reply (in case of success) and an error object
     *         (in case of an error).
     *
     * Example:
     *
     *   speakapApi.request("PUT", "/networks/" + networkId + "/messages/" + messageId + "/",
     *                      { commentable: false }, {}, function(error, result) {
     *       if (error) {
     *           // handle error
     *       } else {
     *           // do something with result
     *       }
     *   });
     */
    request: function(method, path, data, options, callback) {

        if (!_.isObject(options) || _.isFunction(options)) {
            callback = options;
            options = {};
        }

        var headers = {
            Accept: options.accept || "application/vnd.speakap.api-v" + this.apiVersion + "+json"
        };

        var accessToken = options.accessToken || this.accessToken;
        if (accessToken) {
            headers.Authorization = "Bearer " + accessToken;
        }

        var buffer;
        if (data) {
            buffer = new Buffer(data);
            headers["Content-length"] = buffer.length;

            var contentType = options.contentType || "application/json";
            headers["Content-type"] = contentType + "; charset=utf-8";
        }

        var req = this.scheme.request({
            headers: headers,
            hostname: this.hostname,
            method: method,
            path: path
        }, function(res) {
            var responseBody = "";
            res.setEncoding("utf8");
            res.on("data", function(chunk) { responseBody += chunk; });
            res.on("end", function() {
                var error = null;
                var result = null;

                try {
                    if (res.statusCode === 204) {
                        result = true;
                    } else if (res.statusCode >= 200 && res.statusCode < 300) {
                        result = JSON.parse(responseBody);
                    } else {
                        error = JSON.parse(responseBody);
                    }
                } catch(exception) {
                    error = {
                        code: -1001,
                        message: "Unexpected Reply",
                        description: responseBody
                    };
                }

                if (callback) {
                    callback(error, result);
                }
            });
        });
        req.on("error", function(error) {
            if (callback) {
                callback({ code: -1000, message: "Request Failed", requestError: error });
            }
        });

        if (buffer) {
            req.write(buffer);
        }
        req.end();
    }

});

module.exports = {
    percentEncode: percentEncode,
    signedRequest: signedRequest,
    validateSignature: validateSignature,
    API: API
};
