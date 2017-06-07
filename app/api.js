var path       = require("path"),
    util       = require("util"),
    iwlist     = require("./iwlist"),
    express    = require("express"),
    bodyParser = require('body-parser'),
    config     = require("../config.json"),
    http_test  = config.http_test_only,
    http_server;
// Helper function to log errors and send a generic status "SUCCESS"
// message to the caller
function log_error_send_success_with(success_obj, error, response) {
    if (error) {
        console.log("ERROR: " + error);
        response.send({ status: "ERROR", error: error });
    } else {
        success_obj = success_obj || {};
        success_obj["status"] = "SUCCESS";
        response.send(success_obj);
    }
    response.end();
}

/*****************************************************************************\
    Returns a function which sets up the app and our various routes.
\*****************************************************************************/
module.exports = function(wifi_manager, callback) {
    var app = express();

    // Configure the app
    app.set("trust proxy", true);

    // Setup static routes to public assets
    app.use(express.static(path.join(__dirname, "public")));
    app.use(bodyParser.json());

    // Setup HTTP routes for various APIs we wish to implement
    // the responses to these are typically JSON
    app.get("/api/hub/config", function(req, res) {
        console.log("Server got /config");
        iwlist(function(error, iw_result) {
            var msg = {
                hub_name : config.hub_name,
                result : error ? "failure" : "success",
                wifi_info : iw_result[0]
            };
            
            res.json (msg);
        });
    });

    app.post("/api/hub/config", function(request, response) {
        var msg = {
            success : false
        };
        
        // Validate expected json body members
        if (!request.body.hub_name || !request.body.wifi_ssid || !request.body.wifi_passcode) {
            response.json (msg);
            return;
        }
        
        // Updated hub and ssid based on the supplied hub name
        config.ssid = request.body.hub_name;
        config.hub_name = request.body.hub_name;

        // TODO: If wifi did not come up correctly, it should fail
        // currently we ignore ifup failures.
        var conn_info = {
            wifi_ssid:      request.body.wifi_ssid,
            wifi_passcode:  request.body.wifi_passcode,
        };

        wifi_manager.enable_wifi_mode(conn_info, function(error) {
            if (error) {
                console.log("Enable Wifi ERROR: " + error);
                console.log("Attempt to re-enable AP mode");
                wifi_manager.enable_ap_mode(config.access_point.ssid, function(error) {
                    console.log("... AP mode reset");
                });
                response.send(msg);
            }
            
            // Success! - exit in 3 seconds
            console.log ("Hub configuration update successful - exitting.");
            msg.success = true;
            response.json (msg);
            setTimeout (function () {process.exit ();}, 3000);
        });
        
    });

    // Listen on our server
    http_server = app.listen(config.server.port);
}
