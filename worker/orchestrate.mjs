// Split between the account book and one Durable Object per match.
// The account book reserves the room code and enforces the open-room limit.
// The match object is the only place that keeps hidden cards.
import {ApiError} from '../server/domain.mjs';

function validFirst(first){
 if(!['me','opponent','random'].includes(first))throw new ApiError(400,'請選擇先手。');
}

export async function durableCreate(callAccount,callRoom,{token,first,deckId}){
 await callAccount({op:'session',token});
 validFirst(first);
 const prepared=await callAccount({op:'prepareSeat',token,deckId});
 const reserved=await callAccount({op:'reserve',userId:prepared.user.id});
 try{
  const created=await callRoom(reserved.code,{op:'create',code:reserved.code,first,...prepared});
  await callAccount({op:'mark',code:reserved.code,status:created.status,updatedAt:created.updatedAt});
  return created.public;
 }catch(error){
  try{await callAccount({op:'release',code:reserved.code});}catch{/* The original error is what the player sees. */}
  throw error;
 }
}
export async function durableJoin(callAccount,callRoom,{token,code,deckId}){
 const session=await callAccount({op:'session',token});
 await callRoom(code,{op:'joinPreview',code,userId:session.id});
 const prepared=await callAccount({op:'prepareSeat',token,deckId});
 const joined=await callRoom(code,{op:'join',code,...prepared});
 await callAccount({op:'mark',code,guestId:prepared.user.id,status:joined.status,updatedAt:joined.updatedAt});
 return joined.public;
}
export async function durableView(callAccount,callRoom,{token,code}){
 const session=await callAccount({op:'session',token});
 const viewed=await callRoom(code,{op:'view',code,userId:session.id});
 try{await callAccount({op:'mark',code,status:viewed.status,updatedAt:viewed.updatedAt});}catch{/* The match itself is already saved. */}
 return viewed.public;
}
export async function durableAct(callAccount,callRoom,{token,code,index}){
 const session=await callAccount({op:'session',token});
 const acted=await callRoom(code,{op:'act',code,userId:session.id,index});
 try{await callAccount({op:'mark',code,status:acted.status,updatedAt:acted.updatedAt});}catch{/* The match itself is already saved. */}
 return acted.public;
}
export async function durableResign(callAccount,callRoom,{token,code}){
 const session=await callAccount({op:'session',token});
 const ended=await callRoom(code,{op:'resign',code,userId:session.id});
 try{await callAccount({op:'mark',code,status:ended.status,updatedAt:ended.updatedAt});}catch{/* The match itself is already saved. */}
 return ended.public;
}
export async function durableCancel(callAccount,callRoom,{token,code}){
 const session=await callAccount({op:'session',token});
 const cancelled=await callRoom(code,{op:'cancel',code,userId:session.id});
 await callAccount({op:'release',code});
 return cancelled.public;
}
