// サーバーに接続
const socket = io();

var screen = document.getElementById("screen").getContext("2d");
var canvas = document.getElementById("screen");
var ctx = canvas.getContext("2d");

var SCREEN_WIDTH = 900;
var SCREEN_HEIGHT = 550;
var TIMER_INTERVAL = 15; //15で大体FPS=60

var frame_timer;
var counter_1 = 0;
var counter_2 = 0;
var counter_3 = 0;
var randomized_number_1;
var randomized_number_2;

var frontEndBall_x = SCREEN_WIDTH/2;
var frontEndBall_y = SCREEN_HEIGHT/10 * 2;
var ball_width = 10;
var ball_height = 10;
var ball_right = frontEndBall_x + ball_width;
var ball_left = frontEndBall_x;
var ball_top = frontEndBall_y;
var ball_bottom = frontEndBall_y + ball_height
var ball_center_x = frontEndBall_x + ball_width/2;
var ball_center_y = frontEndBall_y + ball_height/2;


var frontEndBall_speed_x = -2;
var frontEndBall_speed_y = 1;
var backEndBall_speed_x;
var backEndBall_speed_y;

var player_x = 50;
var player_y = SCREEN_HEIGHT/10*4;

var cpu_x = SCREEN_WIDTH - 50;
var cpu_y = SCREEN_HEIGHT/10*4;

var paddle_width = 10;
var paddle_height = 120;

var player_right = player_x + paddle_width;
var player_left = player_x;
var player_top = player_y;
var player_bottom = player_y + paddle_height;
var player_center_x = player_x + paddle_width/2;
var player_center_y = player_y + paddle_height/2;

var cpu_right = cpu_x + paddle_width;
var cpu_left = cpu_x;
var cpu_top = cpu_y;
var cpu_bottom = cpu_y + paddle_height;
var cpu_center_x = cpu_x + paddle_width/2;
var cpu_center_y = cpu_y + paddle_height/2;

var player_move_flag_right;
var player_move_flag_left;
var player_move_flag_up;
var player_move_flag_down;

var player_speed = 3;
var cpu_speed = 1.5;

var score_left = 0;
var score_right = 0;
var win_left_flag = false;
var win_right_flag = false;

var game_run = false;
var level_clear = false;
var gameover = false;
var restart = false;

var frontEndPlayer;

const frontEndPlayers = {};

class PlayerPaddle {
    constructor (x, y, color) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 120;
        this.color = color;
    }

    draw () {
        screen.fillStyle = this.color;
        screen.fillRect (this.x, this.y, this.width, this.height);
    }
}

socket.on('updatePlayers', (backEndPlayers) => {
    for (const id in backEndPlayers){
      const backEndPlayer = backEndPlayers[id]

      frontEndPlayer = frontEndPlayers[id]
  
      if (!frontEndPlayers[id]){
        frontEndPlayers[id] = new PlayerPaddle(backEndPlayer.x, backEndPlayer.y, backEndPlayer.color);
      } else {
        //既にプレイヤーが存在している場合
        frontEndPlayers[id].x = backEndPlayer.x
        frontEndPlayers[id].y = backEndPlayer.y
        frontEndPlayers[id].color = backEndPlayer.color
      }
    }
    //プレイヤーの削除
    for (const id in frontEndPlayers) {
      if (!backEndPlayers[id]) {
        delete frontEndPlayers[id];
      }
    }
  });

window.onload = function(){
    switchDisplayLayout();
    requestAnimationFrame(mainLoop);
}

window.onresize = function(){
    switchDisplayLayout();
}


function mainLoop(){
    if (!frame_timer) {
        frame_timer = performance.now();
    }
    //インターバルを挟んで実行させる（フレームレート制限）
    if (frame_timer + TIMER_INTERVAL < performance.now()) {
        frame_timer += TIMER_INTERVAL;

        draw();
        move_player_input();
        move_player();
    }

    // ループさせる
    requestAnimationFrame(mainLoop);
}

function draw(){
    // 画面の上塗り
    screen.fillStyle = "#222222";
    screen.fillRect(0,0,SCREEN_WIDTH,SCREEN_HEIGHT);

    // ボールの描画
    screen.fillStyle = "#ffffff";
    screen.fillRect (frontEndBall_x, frontEndBall_y, ball_width, ball_height);

    // テキストの描画
    screen.font = "50px monospace";
    screen.fillStyle = "#ffffff";
    screen.fillText(score_left, SCREEN_WIDTH/10*2, SCREEN_HEIGHT/10*2);
    screen.fillText(score_right, SCREEN_WIDTH/10*8, SCREEN_HEIGHT/10*2);

    if (game_run == false){
        screen.font = "50px monospace";
        screen.fillStyle = "#ffffff";
        screen.fillText("Press [Space] to Start", SCREEN_WIDTH/10*2, SCREEN_HEIGHT/10*6);
    }

    if (win_left_flag == true){
        counter_3 += 1;
        if (counter_3 < 80*5){
            screen.font = "70px monospace";
            screen.fillStyle = "#ffffff";
            screen.fillText("Left Side Win", SCREEN_WIDTH/10*2.5, SCREEN_HEIGHT/10*4.5);
        } else {
            counter_3 = 0;
            win_left_flag = false;
        }
    }

    if (win_right_flag == true){
        counter_3 += 1;
        if (counter_3 < 80*5){
            screen.font = "70px monospace";
            screen.fillStyle = "#ffffff";
            screen.fillText("Right Side Win", SCREEN_WIDTH/10*2.5, SCREEN_HEIGHT/10*4.5);
        } else {
            counter_3 = 0;
            win_right_flag = false;
        }
    }

    for (const id in frontEndPlayers) {
        const frontEndPlayer = frontEndPlayers[id];
        frontEndPlayer.draw();
    }
}

// ゲーム開始
socket.on('press_space_from_server', () => {
    game_run = true;
})

// スコアの更新
socket.on('update_game_state', (score_right_from_server, score_left_from_server) => {
    score_right = score_right_from_server;
    score_left = score_left_from_server;
})

socket.on('win_left', () => {
    win_left_flag = true;
    game_run = false;
    console.log("win_left");
})

socket.on('win_right', () => {
    win_right_flag = true;
    game_run = false;
})

// ボール座標の受信
socket.on('ball_position_state_from_server', (backEndBall_x, backEndBall_y) => {
    frontEndBall_x = backEndBall_x;
    frontEndBall_y = backEndBall_y;
})

socket.on('ball_speed_state_from_server', (backEndBall_speed_x, backEndBall_speed_y) => {
    frontEndBall_speed_x = backEndBall_speed_x;
    frontEndBall_speed_y = backEndBall_speed_y;
})


function move_player_input(){
    window.onkeydown = function(inputtedValue){
        if (!frontEndPlayers[socket.id]) return;
            // 左入力
            if (inputtedValue.keyCode == 37 || inputtedValue.keyCode == 65){
                player_move_flag_left = true;
            }
            // 右入力
            if (inputtedValue.keyCode == 39 || inputtedValue.keyCode == 68){
                player_move_flag_right = true;
            }
            // 上入力
            if (inputtedValue.keyCode == 38 || inputtedValue.keyCode == 87){
                player_move_flag_up = true;
            }
            // 下入力
            if (inputtedValue.keyCode == 40 || inputtedValue.keyCode == 83){
                player_move_flag_down = true; 
            }

            // スペースバー
            if (inputtedValue.keyCode == 32){
                socket.emit('press_space_from_client'); 
            }
    }
    
    window.onkeyup = function(inputtedValue){
        // 左入力停止
        if (inputtedValue.keyCode == 37 || inputtedValue.keyCode == 65){
            player_move_flag_left = false;
        }
        // 右入力停止
        if (inputtedValue.keyCode == 39 || inputtedValue.keyCode == 68){
            player_move_flag_right = false;
        }
        // 上入力停止
        if (inputtedValue.keyCode == 38 || inputtedValue.keyCode == 87){
            player_move_flag_up = false;
        }
        // 下入力停止
        if (inputtedValue.keyCode == 40 || inputtedValue.keyCode == 83){
            player_move_flag_down = false;
        }
    }
}

function move_player(){
    if (!(frontEndPlayers.x + 10 + 10 > backEndBall_x && frontEndPlayers.x - 10 < backEndBall_x + 10 && frontEndPlayers.y - 10 < backEndBall_y + 10 && frontEndPlayers.y + 120 + 10 > backEndBall_y)){
        if (player_move_flag_left == true){
            socket.emit('keydown', 'ArrowLeft')
        }
        if (player_move_flag_right == true){
            socket.emit('keydown', 'ArrowRight')
        }
        if (player_move_flag_up == true){
            socket.emit('keydown', 'ArrowUp')
        }
        if (player_move_flag_down == true){
            socket.emit('keydown', 'ArrowDown')
        }
    }
}

function switchDisplayLayout(){
    if (window.matchMedia('(max-width: 780px)').matches){
        document.getElementById('buttons').style.display = 'block';

        let display = document.getElementById('screen');
        display.style.display = 'block';
        display.style.width = '100%';
        display.style.height = '100%';
        display.style.margin = '0';
        display.style.padding = '0';
    } else {
        document.getElementById('buttons').style.display = 'none';
    }
}


document.getElementById('buttonLeft').addEventListener('touchstart', touchLeft);
document.getElementById('buttonLeft').addEventListener('touchend', untouchLeft);
document.getElementById('buttonRight').addEventListener('touchstart', touchRight);
document.getElementById('buttonRight').addEventListener('touchend', untouchRight);
document.getElementById('buttonUp').addEventListener('touchstart', touchUp);
document.getElementById('buttonUp').addEventListener('touchend', untouchUp);
document.getElementById('buttonDown').addEventListener('touchstart', touchDown);
document.getElementById('buttonDown').addEventListener('touchend', untouchDown);


function touchSpace(){
    socket.emit('press_space_from_client');
}

function touchLeft(){
    player_move_flag_left = true;
}
function untouchLeft(){
    player_move_flag_left = false;
}

function touchRight(){
    player_move_flag_right = true;
}
function untouchRight(){
    player_move_flag_right = false;
}

function touchUp(){
    player_move_flag_up = true;
}
function untouchUp(){
    player_move_flag_up = false;
}

function touchDown(){
    player_move_flag_down = true;
}
function untouchDown(){
    player_move_flag_down = false;
}

// 要素選択の禁止
document.onselectstart = function() {
    return false;
  }
