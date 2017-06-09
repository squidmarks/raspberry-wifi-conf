var path       = require("path"),
    util       = require("util"),
    iwlist     = require("./iwlist"),
    express    = require("express"),
    bodyParser = require("body-parser"),
    fs         = require("fs"),
    config     = require("../config.json"),
    http_test  = config.http_test_only,
    
    http_server;
// Helper function to log errors and send a generic status "SUCCESS"
// message to the caller
function log_error_send_success_with(success_obj, error, res) {
    if (error) {
        console.log("ERROR: " + error);
        res.send({ status: "ERROR", error: error });
    } else {
        success_obj = success_obj || {};
        success_obj["status"] = "SUCCESS";
        res.send(success_obj);
    }
    res.end();
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
        console.log("Server GET /api/hub/config");
        iwlist(function(error, iw_result) {
            console.log (iw_result);
            var msg = {
                hub_name : config.hub_name,
                result : error ? "failure" : "success",
                wifi_info : iw_result[0]
            };
            
            res.json (msg);
        });
    });

    app.post("/api/hub/config", function(req, res) {
        console.log("Server POST /api/hub/config");
        // Validate expected json body members
        if (req.body.hub_name === undefined || !req.body.wifi_ssid === undefined || !req.body.wifi_passcode === undefined) {
            res.status (400);
            res.send ('invalid syntax');
            return;
        }
        
        // Update hub and ssid based on the supplied hub name
        config.hub_name = req.body.hub_name;
        config.access_point.ssid = req.body.hub_name;
        fs.writeFileSync ('config.json', JSON.stringify (config, null, 3), 'utf8');
        
        // TODO: If wifi did not come up correctly, it should fail
        // currently we ignore ifup failures.
        var conn_info = {
            wifi_ssid:      req.body.wifi_ssid,
            wifi_passcode:  req.body.wifi_passcode,
        };

        wifi_manager.enable_wifi_mode(conn_info, function(error) {
            if (error) {
                console.log("Enable Wifi ERROR: " + error);
                console.log("Attempt to re-enable AP mode");
                wifi_manager.enable_ap_mode(config.access_point.ssid, function(error) {
                    console.log("... AP mode reset");
                });
                
                res.status (400);
                res.send ('failed to enable wifi');
            }
            
            // Success! - exit in 3 seconds
            console.log ("Hub configuration update successful - exitting.");
            res.status (200);
            res.send ('success');
            setTimeout (function () {process.exit ();}, 3000);
        });
        
    });

    // Listen on our server
    http_server = app.listen(config.server.port);
}
