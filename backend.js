const express = require('express');
const http = require('http');
// Socket.ioのインポート
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const PORT = process.env.PORT || 3000;


var SCREEN_WIDTH = 900;
var SCREEN_HEIGHT = 550;
var TIMER_INTERVAL = 15; //15で大体FPS=60

var frame_timer;
var counter_1 = 0;
var counter_2 = 0;
var counter_3 = 0;
var randomized_number_1;
var randomized_number_2;

var backEndBall_x = SCREEN_WIDTH/2;
var backEndBall_y = SCREEN_HEIGHT/10 * 2;
var ball_width = 10;
var ball_height = 10;
var ball_right = backEndBall_x + ball_width;
var ball_left = backEndBall_x;
var ball_top = backEndBall_y;
var ball_bottom = backEndBall_y + ball_height
var ball_center_x = backEndBall_x + ball_width/2;
var ball_center_y = backEndBall_y + ball_width/2;

var backEndBall_speed_x = -2;
var backEndBall_speed_y = 1;

var player_x = 50;
var player_y = SCREEN_HEIGHT/10*4;

var cpu_x = SCREEN_WIDTH - 50;
var cpu_y = SCREEN_HEIGHT/10*4;

var paddle_width = 10;
var paddle_height = 120;

var player_move_flag_right;
var player_move_flag_left;
var player_move_flag_up;
var player_move_flag_down;

var player_speed = 3;
var cpu_speed = 1.5;

var score_left = 0;
var score_right = 0;

var score_add_flag_1 = true;
var score_add_flag_2 = false;

var game_run = false;
var level_clear = false;
var gameover = false;
var restart = false;

var paddle_collide_flag = true;

const backEndPlayers = {}

// ルーティング設定 ('/'にリクエストがあった場合にsrc/index.htmlを返す)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname));

// 3000番ポートでhttpサーバー起動
server.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});

// クライアントがページに接続すると以下の処理が実行される
io.on('connection', (socket) => {
    console.log('A user connected');

    backEndPlayers[socket.id] = {
        x: 800 * Math.random(),
        y: 400 * Math.random(),
        color: `hsl(${360 * Math.random()}, 100%, 50%)` // ランダムな色にする
      }
    
      io.emit('updatePlayers', backEndPlayers)
    
      // プレイヤーの接続切断チェックとプレイヤーの削除
      socket.on('disconnect', (reason) => {
        console.log(reason);
        delete backEndPlayers[socket.id]
        io.emit('updatePlayers', backEndPlayers)
      })

    // スペースバー入力
    socket.on('press_space_from_client', () => {
        game_run = true;
        io.emit('press_space_from_server');
    })

    // プレイヤーの移動
    socket.on('keydown', (keycode) => {
        if (!(backEndPlayers[socket.id].x + 10 + 10 > backEndBall_x && backEndPlayers[socket.id].x - 10 < backEndBall_x + 10 && backEndPlayers[socket.id].y - 10 < backEndBall_y + 10 && backEndPlayers[socket.id].y + 120 + 10 > backEndBall_y)){
            switch (keycode) {
                case 'ArrowLeft':
                backEndPlayers[socket.id].x -= 5;
                break

                case 'ArrowRight':
                backEndPlayers[socket.id].x += 5;
                break
        
                case 'ArrowUp':
                backEndPlayers[socket.id].y -= 5;
                break

                case 'ArrowDown':
                backEndPlayers[socket.id].y += 5;
                break
            }
        }

        if (backEndPlayers[socket.id].x < 10){
            backEndPlayers[socket.id].x = 10;
        }
        if (backEndPlayers[socket.id].x + 20 > SCREEN_WIDTH){
            backEndPlayers[socket.id].x = SCREEN_WIDTH - 20;
        }
        if (backEndPlayers[socket.id].y < 0){
            backEndPlayers[socket.id].y = 0;
        }
        if (backEndPlayers[socket.id].y + 120 > SCREEN_HEIGHT){
            backEndPlayers[socket.id].y = SCREEN_HEIGHT - 120;
        }
    })    
});

setInterval(() => {
    io.emit('updatePlayers', backEndPlayers)
    game_manager();

    for (const socketId in backEndPlayers) {
        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
            collide_paddle(playerSocket);
        }
    }

    if (game_run == true){
        check_ball_state();
        move_ball();
    }
}, 15)

function game_manager(){
    if (backEndBall_x <= 0){
        if (score_add_flag_1 == true){
            score_right += 1;
            score_add_flag_1 = false;
        }
        backEndBall_speed_x = 0;
        backEndBall_speed_y = 0;
        io.emit('update_game_state', score_right, score_left);
        if (score_right == 5){
            io.emit('win_right')
            game_run = false;
            counter_2 += 1;
            if (counter_2 >= 80*5){
                score_left = 0;
                score_right = 0;
                io.emit('update_game_state', score_right, score_left);
            }
        }
    }
    if (backEndBall_x >= SCREEN_WIDTH -10){
        if (score_add_flag_1 == true){
            score_left += 1;
            score_add_flag_1 = false;
        }
        backEndBall_speed_x = 0;
        backEndBall_speed_y = 0;
        io.emit('update_game_state', score_right, score_left);
        if (score_left == 5){
            io.emit('win_left')
            game_run = false;
            counter_2 += 1;
            if (counter_2 >= 80*5){
                score_left = 0;
                score_right = 0;
                io.emit('update_game_state', score_right, score_left);
            }
        }
    }
}

function check_ball_state(){
    if (game_run == true){
        if (backEndBall_speed_x < 0.1 && backEndBall_speed_x > -0.1 && backEndBall_speed_y < 0.1 && backEndBall_speed_y > -0.1){
            counter_1 += 1;
            if (counter_1 >= 80*3){ //80で約1秒
                backEndBall_x = SCREEN_WIDTH/2;
                backEndBall_y = SCREEN_HEIGHT/10 * 2;
                backEndBall_speed_x = 0;
                backEndBall_speed_y = 0;
                if (counter_1 >= 80*6){
                    randomized_number_1 = Math.round(Math.random());
                    if (randomized_number_1 == 0){
                        backEndBall_speed_x = 3;
                    }
                    else{
                        backEndBall_speed_x = -3;
                    }
                    backEndBall_speed_y = 2;
                    counter_1 = 0;
                    score_add_flag_1 = true;
                }
            }
        }
    }
}

function move_ball(){
    backEndBall_x += backEndBall_speed_x;
    backEndBall_y += backEndBall_speed_y;

    if (backEndBall_x < 0 || backEndBall_x > SCREEN_WIDTH -10){
        backEndBall_speed_x = -backEndBall_speed_x;
    }
    if (backEndBall_y < 0 || backEndBall_y > SCREEN_HEIGHT -10){
        backEndBall_speed_y = -backEndBall_speed_y;
    }

    if (backEndBall_x < 0){
        backEndBall_x = 0;
    }
    if (backEndBall_x > SCREEN_WIDTH -10){
        backEndBall_x = SCREEN_WIDTH -10;
    }
    if (backEndBall_y < 0){
        backEndBall_y = 0;
    }
    if (backEndBall_y > SCREEN_HEIGHT -10){
        backEndBall_y = SCREEN_HEIGHT -10;
    }

    io.emit('ball_position_state_from_server', backEndBall_x, backEndBall_y)
}

function collide_paddle(socket){
    if (backEndPlayers[socket.id].x + paddle_width > backEndBall_x && 
        backEndPlayers[socket.id].x < backEndBall_x + ball_width && 
        backEndPlayers[socket.id].y < backEndBall_y + ball_height && 
        backEndPlayers[socket.id].y + paddle_height/3*1 > backEndBall_y){
        if (paddle_collide_flag == true){
            backEndBall_speed_x = - backEndBall_speed_x;
            backEndBall_speed_y -= 2;
            paddle_collide_flag = false;
        }
        io.emit('backEndBall_speed_state_from_server', backEndBall_speed_x, backEndBall_speed_y);
    }

    if (backEndPlayers[socket.id].x + paddle_width > backEndBall_x && 
        backEndPlayers[socket.id].x < backEndBall_x + ball_width && 
        backEndPlayers[socket.id].y + paddle_height/3*1 < backEndBall_y + ball_height && 
        backEndPlayers[socket.id].y + paddle_height/3*2 > backEndBall_y){
        if (paddle_collide_flag == true){
            backEndBall_speed_x = - backEndBall_speed_x * 1.1;
            paddle_collide_flag = false;
        }
        io.emit('backEndBall_speed_state_from_server', backEndBall_speed_x);
    }

    if (backEndPlayers[socket.id].x + paddle_width > backEndBall_x && 
        backEndPlayers[socket.id].x < backEndBall_x + ball_width && 
        backEndPlayers[socket.id].y + paddle_height/3*2 < backEndBall_y + ball_height && 
        backEndPlayers[socket.id].y + paddle_height/3*3 > backEndBall_y){
        if (paddle_collide_flag == true){
            backEndBall_speed_x = - backEndBall_speed_x;
            backEndBall_speed_y += 2;
            paddle_collide_flag = false;
        }
        io.emit('backEndBall_speed_state_from_server', backEndBall_speed_x, backEndBall_speed_y);
    }

    // ボールがパドルから離れたらコリジョンを再有効化
    if (!(backEndPlayers[socket.id].x + paddle_width +10 > backEndBall_x && 
        backEndPlayers[socket.id].x -10 < backEndBall_x + ball_width && 
        backEndPlayers[socket.id].y -10 < backEndBall_y + ball_height && 
        backEndPlayers[socket.id].y + paddle_height +10 > backEndBall_y)){
        paddle_collide_flag = true;
    }
}
