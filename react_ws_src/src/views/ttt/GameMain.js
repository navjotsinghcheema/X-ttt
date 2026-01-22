import React, { Component } from "react";

import io from "socket.io-client";

import TweenMax from "gsap";

import rand_arr_elem from "../../helpers/rand_arr_elem";
import rand_to_fro from "../../helpers/rand_to_fro";

export default class Game extends Component {
  constructor(props) {
    super(props);

    this.win_sets = [
      ["c1", "c2", "c3"],
      ["c4", "c5", "c6"],
      ["c7", "c8", "c9"],

      ["c1", "c4", "c7"],
      ["c2", "c5", "c8"],
      ["c3", "c6", "c9"],

      ["c1", "c5", "c9"],
      ["c3", "c5", "c7"],
    ];
    this.playerID;
    this.opponentPlayerID;

    if (this.props.game_type != "live")
      this.state = {
        cell_vals: {},
        next_turn_ply: true,
        game_play: true,
        game_stat: "Start game",
      };
    else {
      this.sock_start();

      this.state = {
        cell_vals: {},
        next_turn_ply: true,
        game_play: false,
        game_stat: "Connecting",
        opponent_disconnected: false,
      };
    }
  }

  //	------------------------	------------------------	------------------------

  componentDidMount() {
    TweenMax.from("#game_stat", 1, {
      display: "none",
      opacity: 0,
      scaleX: 0,
      scaleY: 0,
      ease: Power4.easeIn,
    });
    TweenMax.from("#game_board", 1, {
      display: "none",
      opacity: 0,
      x: -200,
      y: -200,
      scaleX: 0,
      scaleY: 0,
      ease: Power4.easeIn,
    });
  }

  //	------------------------	------------------------	------------------------
  //	------------------------	------------------------	------------------------

  sock_start() {
    // this.socket = io(
    //   `app.settings.ws_conf.loc.SOCKET__io.u`,
    // );
    this.socket = io(`http://localhost:3001`);
    this.socket.on(
      "connect",
      function (data) {
        this.socket.emit("new player", { name: app.settings.curr_user.name });
      }.bind(this),
    );
    this.socket.on(
      "player-dto",
      function (playerID) {
        console.log("player id is: ", playerID);
        this.playerID = playerID;
      }.bind(this),
    );

    this.socket.on(
      "pair_players",
      function (data) {
        this.opponentPlayerID = data.opp.sockid;
        this.setState({
          next_turn_ply: data.mode == "m",
          game_play: true,
          game_stat: "Playing with " + data.opp.name,
          opponent_disconnected: false,
        });
      }.bind(this),
    );

    this.socket.on(
      "opponent_disconnected",
      function () {
        console.log("OPPONENT DISCONNECTED");
        this.setState({
          cell_vals: {},
          next_turn_ply: true,
          game_play: false,
          game_stat: "Connecting",
          opponent_disconnected: true,
        });
      }.bind(this),
    );

    this.socket.on(
      "connected_toNewplayer",
      function () {
        this.setState({
          cell_vals: {},
          next_turn_ply: true,
          game_play: false,
          game_stat: "Connecting",
          opponent_disconnected: false,
        });
      }.bind(this),
    );

    this.socket.on("opp_turn", this.turn_opp_live.bind(this));
    this.socket.on(
      "replay-moves",
      function (moves) {
        this.resetBoard();
        console.log("player id", this.playerID);
        var movesQueue = moves.slice();
        var processNextMove = function () {
          if (movesQueue.length === 0) {
            this.check_turn();
            return; // Exit when done
          }

          var m = movesQueue.shift();
          console.log(m);

          setTimeout(
            function () {
              var state = this.state;
              if (m.player_id === this.playerID) {
                state.cell_vals[m.cell_id] = "x";
                state.game_stat = `Your move: ${m.cell_id}`;
              } else {
                state.cell_vals[m.cell_id] = "o";
                state.game_stat = `Opponent's move: ${m.cell_id}`;
              }

              if (this.refs[m.cell_id]) {
                TweenMax.from(this.refs[m.cell_id], 0.7, {
                  opacity: 0,
                  scaleX: 0,
                  scaleY: 0,
                  ease: Power4.easeOut,
                });
              }

              this.setState(state);

              processNextMove();
            }.bind(this),
            1500,
          );
        }.bind(this);

        // Start the loop
        processNextMove();
      }.bind(this),
    );

    this.socket.on(
      "request-play-again",
      function () {
        let state = this.state;
        state.confirm_play_again = true;
        this.setState(state);
      }.bind(this),
    );

    this.socket.on(
      "play_again_approved",
      function (data) {
        this.resetBoard();
        this.setState({
          next_turn_ply: data.mode == "m",
          game_play: true,
          game_stat: "Playing with " + data.opp.name,
          opponent_disconnected: false,
          requesting_rematch: false,
          confirm_play_again: false,
          request_play_again: false,
        });
      }.bind(this),
    );
  }

  //	------------------------	------------------------	------------------------
  //	------------------------	------------------------	------------------------

  componentWillUnmount() {
    this.socket && this.socket.disconnect();
  }

  //	------------------------	------------------------	------------------------

  cell_cont(c) {
    const { cell_vals } = this.state;

    return (
      <div>
        {cell_vals && cell_vals[c] == "x" && (
          <i className="fa fa-times fa-5x"></i>
        )}
        {cell_vals && cell_vals[c] == "o" && (
          <i className="fa fa-circle-o fa-5x"></i>
        )}
      </div>
    );
  }

  //	------------------------	------------------------	------------------------
  render() {
    const { reconnectingNewplayer = false } = this.state;
    const gameEnded =
      this.props.game_type === "live" &&
      this.state.game_play === false &&
      (this.state.game_stat.includes("win") ||
        this.state.game_stat.includes("Draw"));
    return (
      <div id="GameMain">
        <h2>Play {this.props.game_type}</h2>
        {this.state.opponent_disconnected && this.state.game_play === true && (
          <div className="reconnect">
            <h3>
              Opponent has left the game! Would you like to connect with a
              different player or choose game type?
            </h3>
            <div className="btns">
              <button
                onClick={this.connect_newgame.bind(this)}
                className="button"
              >
                <span>
                  Connect New Game{" "}
                  <span
                    className={`fa fa-refresh ${reconnectingNewplayer ? "fa-spin" : ""}`}
                  />
                </span>
              </button>
              <button onClick={this.end_game.bind(this)} className="button">
                <span>
                  Choose Game Type{" "}
                  <span className="fa fa-hand-pointer-o"></span>
                </span>
              </button>
            </div>
          </div>
        )}

        <div id="game_stat">
          <div id="game_stat_msg">{this.state.game_stat}</div>
          {this.state.game_play && (
            <div id="game_turn_msg">
              {this.state.next_turn_ply ? "Your turn" : "Opponent turn"}
            </div>
          )}
        </div>

        <div id="game_board">
          <table>
            <tbody>
              <tr>
                <td
                  id="game_board-c1"
                  ref="c1"
                  onClick={this.click_cell.bind(this)}
                >
                  {" "}
                  {this.cell_cont("c1")}{" "}
                </td>
                <td
                  id="game_board-c2"
                  ref="c2"
                  onClick={this.click_cell.bind(this)}
                  className="vbrd"
                >
                  {" "}
                  {this.cell_cont("c2")}{" "}
                </td>
                <td
                  id="game_board-c3"
                  ref="c3"
                  onClick={this.click_cell.bind(this)}
                >
                  {" "}
                  {this.cell_cont("c3")}{" "}
                </td>
              </tr>
              <tr>
                <td
                  id="game_board-c4"
                  ref="c4"
                  onClick={this.click_cell.bind(this)}
                  className="hbrd"
                >
                  {" "}
                  {this.cell_cont("c4")}{" "}
                </td>
                <td
                  id="game_board-c5"
                  ref="c5"
                  onClick={this.click_cell.bind(this)}
                  className="vbrd hbrd"
                >
                  {" "}
                  {this.cell_cont("c5")}{" "}
                </td>
                <td
                  id="game_board-c6"
                  ref="c6"
                  onClick={this.click_cell.bind(this)}
                  className="hbrd"
                >
                  {" "}
                  {this.cell_cont("c6")}{" "}
                </td>
              </tr>
              <tr>
                <td
                  id="game_board-c7"
                  ref="c7"
                  onClick={this.click_cell.bind(this)}
                >
                  {" "}
                  {this.cell_cont("c7")}{" "}
                </td>
                <td
                  id="game_board-c8"
                  ref="c8"
                  onClick={this.click_cell.bind(this)}
                  className="vbrd"
                >
                  {" "}
                  {this.cell_cont("c8")}{" "}
                </td>
                <td
                  id="game_board-c9"
                  ref="c9"
                  onClick={this.click_cell.bind(this)}
                >
                  {" "}
                  {this.cell_cont("c9")}{" "}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="btns">
          {!gameEnded && (
            <button
              type="submit"
              onClick={this.end_game.bind(this)}
              className="button"
              disabled={this.state.opponent_disconnected}
            >
              <span>
                End Game <span className="fa fa-gamepad"></span>
              </span>
            </button>
          )}

          {gameEnded && (
            <button
              type="submit"
              onClick={this.request_play_again.bind(this)}
              disabled={this.state.confirm_play_again}
              className="button"
            >
              <span>
                Play Again! <span className="fa fa-gamepad"></span>
              </span>
            </button>
          )}

          {gameEnded && (
            <button
              type="submit"
              onClick={this.replay.bind(this)}
              className="button"
            >
              <span>
                Replay <span className="fa fa-play"></span>
              </span>
            </button>
          )}
        </div>
        {this.state.requesting_rematch && (
          <p className="rematch_dialog">
            Waiting for the opponent to accept re-match...
          </p>
        )}
        {this.state.confirm_play_again && (
          <div className="rematch_dialog">
            <p>Player has requested for a re-match</p>
            <button
              onClick={this.acceptRematch.bind(this)}
              className="button"
              disabled={this.state.request_play_again}
            >
              <span>
                Accept <span className="fa fa-reply"></span>
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  //	------------------------	------------------------	------------------------
  //	------------------------	------------------------	------------------------

  resetBoard() {
    this.state.cell_vals = {};
    Array.from(document.getElementsByTagName("td")).map((ref) =>
      ref.classList.remove("win"),
    );
  }

  connect_newgame() {
    let state = this.state;
    state.reconnectingNewplayer = true;
    console.log("CONNECTING WITH A NEW PLAYER");
    this.socket.emit("repairwith_newplayer");
    this.setState(state);
  }

  click_cell(e) {
    // console.log(e.currentTarget.id.substr(11))
    // console.log(e.currentTarget)
    if (!this.state.next_turn_ply || !this.state.game_play) return;

    const cell_id = e.currentTarget.id.substr(11);
    if (this.state.cell_vals[cell_id]) return;

    if (this.props.game_type != "live") this.turn_ply_comp(cell_id);
    else this.turn_ply_live(cell_id);
  }

  //	------------------------	------------------------	------------------------
  //	------------------------	------------------------	------------------------

  turn_ply_comp(cell_id) {
    let { cell_vals } = this.state;

    cell_vals[cell_id] = "x";

    TweenMax.from(this.refs[cell_id], 0.7, {
      opacity: 0,
      scaleX: 0,
      scaleY: 0,
      ease: Power4.easeOut,
    });

    // this.setState({
    // 	cell_vals: cell_vals,
    // 	next_turn_ply: false
    // })

    // setTimeout(this.turn_comp.bind(this), rand_to_fro(500, 1000));

    this.state.cell_vals = cell_vals;

    this.check_turn();
  }

  //	------------------------	------------------------	------------------------

  turn_comp() {
    let { cell_vals } = this.state;
    let empty_cells_arr = [];

    for (let i = 1; i <= 9; i++)
      !cell_vals["c" + i] && empty_cells_arr.push("c" + i);
    // console.log(cell_vals, empty_cells_arr, rand_arr_elem(empty_cells_arr))

    const c = rand_arr_elem(empty_cells_arr);
    cell_vals[c] = "o";

    TweenMax.from(this.refs[c], 0.7, {
      opacity: 0,
      scaleX: 0,
      scaleY: 0,
      ease: Power4.easeOut,
    });

    // this.setState({
    // 	cell_vals: cell_vals,
    // 	next_turn_ply: true
    // })

    this.state.cell_vals = cell_vals;

    this.check_turn();
  }

  //	------------------------	------------------------	------------------------
  //	------------------------	------------------------	------------------------

  turn_ply_live(cell_id) {
    let { cell_vals } = this.state;

    cell_vals[cell_id] = "x";

    TweenMax.from(this.refs[cell_id], 0.7, {
      opacity: 0,
      scaleX: 0,
      scaleY: 0,
      ease: Power4.easeOut,
    });

    this.socket.emit("ply_turn", { cell_id });

    this.setState({
      cell_vals,
      next_turn_ply: false,
    });

    // setTimeout(this.turn_comp.bind(this), rand_to_fro(500, 1000));

    this.state.cell_vals = cell_vals;

    this.check_turn();
  }

  //	------------------------	------------------------	------------------------

  turn_opp_live(data) {
    let { cell_vals } = this.state;
    let empty_cells_arr = [];

    const c = data.cell_id;
    cell_vals[c] = "o";

    TweenMax.from(this.refs[c], 0.7, {
      opacity: 0,
      scaleX: 0,
      scaleY: 0,
      ease: Power4.easeOut,
    });

    // this.setState({
    // 	cell_vals: cell_vals,
    // 	next_turn_ply: true
    // })

    this.state.cell_vals = cell_vals;

    this.check_turn();
  }

  //	------------------------	------------------------	------------------------
  //	------------------------	------------------------	------------------------
  //	------------------------	------------------------	------------------------

  check_turn() {
    const { cell_vals } = this.state;

    let win = false;
    let set;
    let fin = true;

    if (this.props.game_type != "live") this.state.game_stat = "Play";

    for (let i = 0; !win && i < this.win_sets.length; i++) {
      set = this.win_sets[i];
      if (
        cell_vals[set[0]] &&
        cell_vals[set[0]] == cell_vals[set[1]] &&
        cell_vals[set[0]] == cell_vals[set[2]]
      )
        win = true;
    }

    for (let i = 1; i <= 9; i++) !cell_vals["c" + i] && (fin = false);

    // win && console.log('win set: ', set)

    if (win) {
      this.refs[set[0]].classList.add("win");
      this.refs[set[1]].classList.add("win");
      this.refs[set[2]].classList.add("win");

      TweenMax.killAll(true);
      TweenMax.from("td.win", 1, { opacity: 0, ease: Linear.easeIn });

      this.setState({
        game_stat: (cell_vals[set[0]] == "x" ? "You" : "Opponent") + " win",
        game_play: false,
      });
    } else if (fin) {
      this.setState({
        game_stat: "Draw",
        game_play: false,
      });
    } else {
      this.props.game_type != "live" &&
        this.state.next_turn_ply &&
        setTimeout(this.turn_comp.bind(this), rand_to_fro(500, 1000));

      this.setState({
        next_turn_ply: !this.state.next_turn_ply,
      });
    }
  }

  //	------------------------	------------------------	------------------------

  end_game() {
    this.socket && this.socket.disconnect();

    this.props.onEndGame();
  }

  request_play_again() {
    let state = this.state;
    state.requesting_rematch = true;
    this.setState(state);
    this.socket.emit("play_again");
  }

  acceptRematch() {
    this.socket.emit("confirm_play_again");
  }
  replay() {
    this.socket.emit("replay_moves");
  }
}
