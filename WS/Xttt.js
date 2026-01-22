// Setup basic express server
var express = require("express");
var app = express();
var server = require("http").createServer(app);
io = require("socket.io")(server);

util = require("util"); // Utility resources (logging, object inspection, etc)

/**************************************************
 ** GAME VARIABLES
 **************************************************/
Player = require("./Player").Player; // Player class
players = []; // Array of connected players
players_avail = [];
gameplay = [];
win_sets = [
  ["c1", "c2", "c3"],
  ["c4", "c5", "c6"],
  ["c7", "c8", "c9"],

  ["c1", "c4", "c7"],
  ["c2", "c5", "c8"],
  ["c3", "c6", "c9"],

  ["c1", "c5", "c9"],
  ["c3", "c5", "c7"],
];

var port = process.env.PORT || 3001;

server.listen(port, function () {
  console.log("Server listening at port %d", port);
});

// Routing
app.use(express.static(__dirname + "/public"));

require("./XtttGame.js");

io.on("connection", set_game_sock_handlers);
