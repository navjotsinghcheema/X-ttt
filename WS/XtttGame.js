// ----	--------------------------------------------	--------------------------------------------
// ----	--------------------------------------------	--------------------------------------------

// New player has joined
function onNewPlayer(data) {
  console.log("New player has joined: " + data.name);

  // Create a new player
  var newPlayer = new Player(-1, data.name, "looking");
  newPlayer.sockid = this.id;

  this.player = newPlayer;

  // Add new player to the players array
  players.push(newPlayer);
  players_avail.push(newPlayer);

  // console.log("looking for pair - uid:"+newPlayer.uid + " ("+newPlayer.name + ")");
  pair_avail_players();
  io.to(this.player.sockid).emit("player-dto", newPlayer.sockid);
  // updAdmin("looking for pair - uid:"+p.uid + " ("+p.name + ")");

  // updAdmin("new player connected - uid:"+data.uid + " - "+data.name);
}

// ----	--------------------------------------------	--------------------------------------------

function pair_avail_players() {
  while (players_avail.length >= 2) {
    var p1 = players_avail.shift();
    var p2 = players_avail.shift();
    if (!p1 || !p2) continue;

    p1.mode = "m";
    p2.mode = "s";
    p1.status = "paired";
    p2.status = "paired";
    p1.opp = p2;
    p2.opp = p1;

    gameplay.push({ p1, p2, moves: [] });

    io.to(p1.sockid).emit("pair_players", {
      opp: { name: p2.name, uid: p2.uid },
      mode: "m",
    });
    io.to(p2.sockid).emit("pair_players", {
      opp: { name: p1.name, uid: p1.uid },
      mode: "s",
    });

    console.log(
      "connect_new_players - uidM:" +
        p1.uid +
        " (" +
        p1.name +
        ")  ++  uidS: " +
        p2.uid +
        " (" +
        p2.name +
        ")",
    );
  }

  //   //console.log("connect_new_players p1: "+util.inspect(p1, { showHidden: true, depth: 3, colors: true }));

  // io.sockets.connected[p1.sockid].emit("pair_players", {opp: {name:p2.name, uid:p2.uid}, mode:'m'});
  // io.sockets.connected[p2.sockid].emit("pair_players", {opp: {name:p1.name, uid:p1.uid}, mode:'s'});
  // updAdmin("connect_new_players - uidM:"+p1.uid + " ("+p1.name + ")  ++  uidS: "+p2.uid + " ("+p2.name+")");
}
// ----	--------------------------------------------	--------------------------------------------

// ----	--------------------------------------------	--------------------------------------------

function onTurn(data) {
  //console.log("onGameLoadedS with qgid: "+data.qgid);
  const game = gameplay.find(
    (g) => [g.p1.sockid, g.p2.sockid].indexOf(this.player.sockid) !== -1,
  );
  game.moves.push({ player_id: this.player.sockid, cell_id: data.cell_id });
  io.to(this.player.opp.sockid).emit("opp_turn", { cell_id: data.cell_id });
}

// ----	--------------------------------------------	--------------------------------------------
// ----	--------------------------------------------	--------------------------------------------

function replay() {
  const game = gameplay.find(
    (g) => [g.p1.sockid, g.p2.sockid].indexOf(this.player.sockid) !== -1,
  );
  console.log("replay all the moves in the game");
  io.to(this.player.sockid).emit("replay-moves", game.moves);
}
// ----	--------------------------------------------	--------------------------------------------
// ----	--------------------------------------------	--------------------------------------------

function playAgain() {
  console.log(`${this.player.name} requested to play again`);
  var opponent = this.player.opp.sockid;
  if (players.find((p) => p.sockid === opponent)) {
    io.to(opponent).emit("request-play-again");
  }
}

function confirmPlayAgain() {
  console.log(`${this.player.name} confirmed to play again`);
  gameplay.splice(
    gameplay.findIndex((g) => {
      const arr1 = [g.p1.sockid, g.p2.sockid].sort().join(",");
      const arr2 = [this.player.sockid, this.player.opp.sockid]
        .sort()
        .join(",");
      return arr1 === arr2;
    }),
    1,
  );
  gameplay.push({
    p1: this.player,
    p2: this.player.opp,
    moves: [],
  });
  console.log("setting up a re-match...");
  io.to(this.player.sockid).emit("play_again_approved", {
    opp: { name: this.player.opp.name, uid: this.player.opp.uid },
    mode: "m",
  });
  io.to(this.player.opp.sockid).emit("play_again_approved", {
    opp: { name: this.player.name, uid: this.player.uid },
    mode: "s",
  });
}

// ----	--------------------------------------------	--------------------------------------------
// ----	--------------------------------------------	--------------------------------------------
// Opponent player disconnected and this player chose to re-pair with someone else by clicking connect new game
function repair() {
  console.log(
    `Pairing ${this.player.name}(${this.player.uid}) with a new player!`,
  );
  this.player.status = "looking";
  this.player.opp = null;
  if (players_avail.findIndex((p) => p.sockid === this.player.sockid) === -1) {
    players_avail.push(this.player);
  }
  console.log("available players", players_avail);
  pair_avail_players();
}
// ----	--------------------------------------------	--------------------------------------------
// ----	--------------------------------------------	--------------------------------------------

// Socket client has disconnected
function onClientDisconnect() {
  console.log("on DISCONNECT: ", players_avail);
  const removePlayer = this.player;
  console.log("----------removing player-----------\n\n", removePlayer);
  players.splice(players.indexOf(removePlayer), 1);
  //   players_avail.splice(players_avail.indexOf(removePlayer), 1);

  if (this.status == "admin") {
    console.log("Admin has disconnected: " + this.uid);
    //		updAdmin("Admin has disconnected - uid:"+this.uid + "  --  "+this.name);
  } else {
    console.log(
      `Player ${removePlayer.name}(${removePlayer.sockid}) has disconnected`,
      `opp: ${removePlayer.opp}`,
    );
    if (removePlayer.opp) {
      console.log(
        `notifying opponent ${removePlayer.opp.name}(${removePlayer.opp.sockid})`,
      );
      io.to(removePlayer.opp.sockid).emit("opponent_disconnected");
    }
    //		updAdmin("player disconnected - uid:"+removePlayer.uid + "  --  "+removePlayer.name);
  }
}

// ----	--------------------------------------------	--------------------------------------------
// ----	--------------------------------------------	--------------------------------------------

// ----	--------------------------------------------	--------------------------------------------
// ----	--------------------------------------------	--------------------------------------------

set_game_sock_handlers = function (socket) {
  // console.log("New game player has connected: "+socket.id);

  socket.on("new player", onNewPlayer);

  socket.on("repairwith_newplayer", repair);

  socket.on("replay_moves", replay);

  socket.on("play_again", playAgain);

  socket.on("confirm_play_again", confirmPlayAgain);

  socket.on("ply_turn", onTurn);

  socket.on("disconnect", onClientDisconnect);
};
