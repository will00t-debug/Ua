// Shared account and match-room records. Callers supply a synchronous SQL
// adapter. The Node process uses a local SQLite file. Cloudflare keeps the
// same rows inside Durable Objects, so a restart does not drop accounts or
// an unfinished match. Match rows store the engine state, never a public view.

export const SCHEMA=`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_key TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_n INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  counts_json TEXT NOT NULL,
  local_id TEXT,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS decks_user_local
  ON decks(user_id, local_id) WHERE local_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS login_failures (
  id TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  first_choice TEXT NOT NULL,
  first_player INTEGER,
  seed INTEGER,
  winner INTEGER,
  log_json TEXT NOT NULL,
  match_json TEXT,
  seats_json TEXT NOT NULL,
  host_id TEXT NOT NULL,
  guest_id TEXT
);
CREATE TABLE IF NOT EXISTS room_directory (
  code TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  guest_id TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export function roomTtl(status){
 if(status==='playing')return 6*60*60*1000;
 if(status==='finished')return 20*60*1000;
 return 45*60*1000;
}

function userFromRow(row){
 if(!row)return null;
 return {
  id:row.id,username:row.username,usernameKey:row.username_key,
  password:{salt:row.password_salt,hash:row.password_hash,n:row.password_n},
  createdAt:row.created_at
 };
}
function deckFromRow(row){
 return {
  id:row.id,name:row.name,title:row.title,
  counts:JSON.parse(row.counts_json),
  localId:row.local_id||null,updatedAt:row.updated_at
 };
}
function roomFromRow(row){
 if(!row)return null;
 return {
  code:row.code,status:row.status,revision:row.revision,
  createdAt:row.created_at,updatedAt:row.updated_at,
  firstChoice:row.first_choice,
  first:row.first_player==null?null:row.first_player,
  seed:row.seed==null?null:row.seed,
  winner:row.winner==null?null:row.winner,
  log:JSON.parse(row.log_json),
  match:row.match_json?JSON.parse(row.match_json):null,
  seats:JSON.parse(row.seats_json)
 };
}

export function createRepositories(sql){
 function pruneTable(table,now){
  const rows=sql.all('SELECT code,status,updated_at AS updatedAt FROM '+table);
  const gone=[];
  for(const row of rows){
   if(now>row.updatedAt+roomTtl(row.status)){
    sql.run('DELETE FROM '+table+' WHERE code=?',row.code);
    gone.push(row.code);
   }
  }
  return gone;
 }
 function countOpen(table,userId){
  const row=sql.get('SELECT COUNT(*) AS n FROM '+table+' WHERE status!=\'finished\' AND (host_id=? OR guest_id=?)',userId,userId);
  return Number(row?.n||0);
 }
 return {
  findUserByKey(key){
   return userFromRow(sql.get('SELECT * FROM users WHERE username_key=?',key));
  },
  insertUser(user){
   sql.run(`INSERT INTO users (id,username,username_key,password_salt,password_hash,password_n,created_at)
    VALUES (?,?,?,?,?,?,?)`,user.id,user.username,user.usernameKey,user.password.salt,user.password.hash,user.password.n,user.createdAt);
  },
  findSessionUser(tokenHash,now){
   const row=sql.get('SELECT user_id,expires_at FROM sessions WHERE token_hash=?',tokenHash);
   if(!row||row.expires_at<=now)return null;
   return userFromRow(sql.get('SELECT * FROM users WHERE id=?',row.user_id));
  },
  insertSession(tokenHash,userId,expiresAt){
   sql.run('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)',tokenHash,userId,expiresAt);
  },
  deleteSession(tokenHash){sql.run('DELETE FROM sessions WHERE token_hash=?',tokenHash);},
  listDecks(userId){
   return sql.all('SELECT * FROM decks WHERE user_id=? ORDER BY updated_at DESC',userId).map(deckFromRow);
  },
  findDeck(userId,deckId){
   const row=sql.get('SELECT * FROM decks WHERE user_id=? AND id=?',userId,deckId);
   return row?deckFromRow(row):null;
  },
  findDeckByLocal(userId,localId){
   const row=sql.get('SELECT * FROM decks WHERE user_id=? AND local_id=?',userId,localId);
   return row?deckFromRow(row):null;
  },
  countDecks(userId){
   return Number(sql.get('SELECT COUNT(*) AS n FROM decks WHERE user_id=?',userId)?.n||0);
  },
  insertDeck(userId,deck){
   sql.run(`INSERT INTO decks (id,user_id,name,title,counts_json,local_id,updated_at)
    VALUES (?,?,?,?,?,?,?)`,deck.id,userId,deck.name,deck.title,JSON.stringify(deck.counts),deck.localId,deck.updatedAt);
  },
  updateDeck(userId,deck){
   sql.run(`UPDATE decks SET name=?,title=?,counts_json=?,local_id=?,updated_at=? WHERE user_id=? AND id=?`,
    deck.name,deck.title,JSON.stringify(deck.counts),deck.localId,deck.updatedAt,userId,deck.id);
  },
  deleteDeck(userId,deckId){
   sql.run('DELETE FROM decks WHERE user_id=? AND id=?',userId,deckId);
  },
  failure(id,now){
   const row=sql.get('SELECT attempts,reset_at FROM login_failures WHERE id=?',id);
   if(!row||row.reset_at<=now)return null;
   return {count:row.attempts,reset:row.reset_at};
  },
  noteFailure(id,now,windowMs){
   const row=sql.get('SELECT attempts,reset_at FROM login_failures WHERE id=?',id);
   if(!row||row.reset_at<=now){
    sql.run('INSERT INTO login_failures (id,attempts,reset_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET attempts=excluded.attempts, reset_at=excluded.reset_at',
     id,1,now+windowMs);
   }else sql.run('UPDATE login_failures SET attempts=attempts+1 WHERE id=?',id);
  },
  clearFailure(id){sql.run('DELETE FROM login_failures WHERE id=?',id);},
  pruneRooms(now){return pruneTable('rooms',now);},
  countOpenRooms(userId){return countOpen('rooms',userId);},
  roomExists(code){return !!sql.get('SELECT code FROM rooms WHERE code=?',code);},
  loadRoom(code){return roomFromRow(sql.get('SELECT * FROM rooms WHERE code=?',code));},
  saveRoom(room){
   const guest=room.seats[1]?.userId||null;
   sql.run(`INSERT INTO rooms (code,status,revision,created_at,updated_at,first_choice,first_player,seed,winner,log_json,match_json,seats_json,host_id,guest_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(code) DO UPDATE SET
     status=excluded.status,revision=excluded.revision,updated_at=excluded.updated_at,
     first_choice=excluded.first_choice,first_player=excluded.first_player,seed=excluded.seed,
     winner=excluded.winner,log_json=excluded.log_json,match_json=excluded.match_json,
     seats_json=excluded.seats_json,host_id=excluded.host_id,guest_id=excluded.guest_id`,
   room.code,room.status,room.revision,room.createdAt,room.updatedAt,room.firstChoice,
   room.first==null?null:room.first,room.seed==null?null:room.seed,room.winner==null?null:room.winner,
   JSON.stringify(room.log.map(entry=>({text:String(entry.text||'')})).slice(-80)),
   room.match?JSON.stringify(room.match):null,
   JSON.stringify(room.seats),room.seats[0].userId,guest);
  },
  deleteRoom(code){sql.run('DELETE FROM rooms WHERE code=?',code);},
  pruneDirectory(now){return pruneTable('room_directory',now);},
  countOpenDirectory(userId){return countOpen('room_directory',userId);},
  directoryExists(code){return !!sql.get('SELECT code FROM room_directory WHERE code=?',code);},
  insertDirectory(row){
   sql.run(`INSERT INTO room_directory (code,host_id,guest_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
    row.code,row.hostId,row.guestId,row.status,row.createdAt,row.updatedAt);
  },
  markDirectory(row){
   sql.run('UPDATE room_directory SET guest_id=COALESCE(?,guest_id), status=?, updated_at=? WHERE code=?',
    row.guestId||null,row.status,row.updatedAt,row.code);
  },
  deleteDirectory(code){sql.run('DELETE FROM room_directory WHERE code=?',code);}
 };
}
