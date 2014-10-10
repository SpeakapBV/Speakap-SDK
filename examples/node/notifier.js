"use strict";

/**
 * This is an example class that is used to notify Speakap users about schedule
 * updates. The method sendDeletedScheduleNotification() sends an alert to a
 * user whereas sendNewScheduleNotification() sends a timeline update to a user.
 *
 * The class receives a speakapApi object, which is an instance of the Speakap.API
 * class defined in node/speakap.js.
 *
 * The callback methods passed to both methods receive an optional error object
 * in case there was an error.
 */

var _ = require("lodash");

function Notifier(speakapApi) {

    this.speakapApi = speakapApi;
}

_.extend(Notifier.prototype, {

    sendDeletedScheduleNotification: function(networkEid, userEid, week, appData, callback) {

        var bodyDE = "Sie sind nicht mehr zum Arbeiten in Woche " + week + " eingeplant.";
        var bodyEN = "You are no longer scheduled to work in week " + week + ".";
        var bodyNL = "Je bent niet meer ingeroosterd voor week " + week + ".";

        this.speakapApi.post("/networks/" + networkEid + "/alerts/", {
            appData: appData,
            recipients: [{ type: "user", EID: userEid }],
            localizableBody: { "de-DE": bodyDE, "en-US": bodyEN, "nl-NL": bodyNL }
        }, callback);
    },

    sendNewScheduleNotification: function(networkEid, userEid, week, appData, callback) {

        var bodyDE = "Ihr Plan für Woche " + week + " ist verfügbar.";
        var bodyEN = "Your schedule for week " + week + " is available.";
        var bodyNL = "Je rooster voor week " + week + " staat klaar.";

        this.speakapApi.post("/networks/" + networkEid + "/messages/", {
            appData: appData,
            messageType: "app_update",
            recipient: { type: "user", EID: userEid },
            localizableBody: { "de-DE": bodyDE, "en-US": bodyEN, "nl-NL": bodyNL }
        }, callback);
    }

});

module.exports = Notifier;
