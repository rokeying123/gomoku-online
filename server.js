const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.disable('x-powered-by');
app.get('/health', (_req, res) => res.json({ ok: true, service: 'gomoku-online' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

const rooms = new Map();
const SIZE = 15;
const emptyBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
const makeCode = () => { let s=''; do { s=Math.random().toString(36).slice(2,7).toUpperCase(); } while(rooms.has(s)); return s; };
function publicRoom(room) {
  return { code: room.code, board: room.board, players: room.players.map(p => p ? {name:p.name, color:p.color, connected:p.connected} : null), turn: room.turn, status: room.status, winner: room.winner, lastMove: room.lastMove };
}
function emitRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }
function winnerAt(board, r, c, color) {
  for (const [dr,dc] of [[1,0],[0,1],[1,1],[1,-1]]) {
    let n=1;
    for (const sign of [-1,1]) { let rr=r+dr*sign, cc=c+dc*sign; while(rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&board[rr][cc]===color){n++;rr+=dr*sign;cc+=dc*sign;} }
    if(n>=5) return true;
  }
  return false;
}
function leaveRoom(socket) {
  const code = socket.data.room; if (!code) return;
  const room = rooms.get(code); socket.leave(code); socket.data.room = null;
  if (!room) return;
  const i = room.players.findIndex(p => p && p.id === socket.id);
  if (i >= 0) { room.players[i].connected = false; room.players[i].id = null; emitRoom(room); }
  if (room.players.every(p => !p || !p.connected)) rooms.delete(code);
}
io.on('connection', socket => {
  socket.on('room:create', ({name}, cb=()=>{}) => {
    leaveRoom(socket); const code=makeCode();
    const room={code, board:emptyBoard(), players:[{id:socket.id,name:String(name||'玩家1').slice(0,16),color:1,connected:true},{id:null,name:null,color:2,connected:false}],turn:1,status:'waiting',winner:0,lastMove:null,rematch:new Set()};
    rooms.set(code,room); socket.join(code); socket.data.room=code; cb({ok:true,room:publicRoom(room),color:1}); emitRoom(room);
  });
  socket.on('room:join', ({code,name}, cb=()=>{}) => {
    leaveRoom(socket); code=String(code||'').trim().toUpperCase(); const room=rooms.get(code);
    if(!room) return cb({ok:false,error:'房间不存在，请检查房间号。'});
    if(room.players.some(p=>p&&p.id===socket.id)) return cb({ok:true,room:publicRoom(room),color:room.players.find(p=>p.id===socket.id).color});
    const slot=room.players.findIndex(p=>!p||!p.connected);
    if(slot<0) return cb({ok:false,error:'房间已满，两名玩家正在对战。'});
    room.players[slot]={id:socket.id,name:String(name||`玩家${slot+1}`).slice(0,16),color:slot+1,connected:true};
    room.status='playing'; socket.join(code); socket.data.room=code; cb({ok:true,room:publicRoom(room),color:slot+1}); emitRoom(room);
  });
  socket.on('game:move', ({row,col}) => {
    const room=rooms.get(socket.data.room); if(!room||room.status!=='playing') return;
    const player=room.players.find(p=>p&&p.id===socket.id); if(!player||player.color!==room.turn) return;
    if(!Number.isInteger(row)||!Number.isInteger(col)||row<0||row>=SIZE||col<0||col>=SIZE||room.board[row][col]!==0) return;
    room.board[row][col]=player.color; room.lastMove={row,col};
    if(winnerAt(room.board,row,col,player.color)){room.status='finished';room.winner=player.color;}
    else if(room.board.every(line=>line.every(v=>v!==0))){room.status='draw';}
    else room.turn=player.color===1?2:1;
    emitRoom(room);
  });
  socket.on('game:rematch', () => {
    const room=rooms.get(socket.data.room); if(!room||!['finished','draw'].includes(room.status)) return;
    const player=room.players.find(p=>p&&p.id===socket.id); if(!player) return;
    room.rematch.add(player.color);
    io.to(room.code).emit('game:rematchStatus',{count:room.rematch.size});
    if(room.rematch.size===2){room.board=emptyBoard();room.turn=1;room.status='playing';room.winner=0;room.lastMove=null;room.rematch.clear();emitRoom(room);}
  });
  socket.on('game:chat', ({message}) => {
    const room=rooms.get(socket.data.room); if(!room) return;
    const player=room.players.find(p=>p&&p.id===socket.id); if(!player) return;
    const text=String(message||'').trim().slice(0,160); if(text) io.to(room.code).emit('game:chat',{name:player.name,color:player.color,message:text});
  });
  socket.on('disconnect',()=>leaveRoom(socket));
});
server.listen(PORT,()=>console.log(`Gomoku running on http://localhost:${PORT}`));
