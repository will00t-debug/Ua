// Split between the account book and one Durable Object per match.
// The account book reserves the room code and enforces the open-room limit.
// The match object is the only place that keeps hidden cards.
import {ApiError,roomsToDrop} from '../server/domain.mjs';

function validFirst(first){
 if(!['me','opponent','random'].includes(first))throw new ApiError(400,'請選擇先手。');
}

async function applyDirectoryDrop(callAccount,callRoom,userId,drop){
 if(drop.how==='abandoned'&&drop.status==='opening'){
  await callAccount({op:'release',code:drop.code});
  return true;
 }
 try{
  if(drop.how==='abandoned'){
   await callRoom(drop.code,{op:'cancel',code:drop.code,userId});
   await callAccount({op:'release',code:drop.code});
  }else{
   const ended=await callRoom(drop.code,{op:'resign',code:drop.code,userId});
   try{await callAccount({op:'mark',code:drop.code,status:ended.status,updatedAt:ended.updatedAt});}
   catch{await callAccount({op:'release',code:drop.code});}
  }
  return true;
 }catch(error){
  if(!(error instanceof ApiError))throw error;
  if(error.status===404||(drop.how==='left'&&error.status===409)){
   try{await callAccount({op:'release',code:drop.code});}catch{/* The directory row is already gone. */}
   return true;
  }
  if(drop.how==='abandoned'&&(error.status===403||error.status===409))return false;
  throw error;
 }
}
export async function durableCreate(callAccount,callRoom,{token,first,deckId,replaceOldest=false}){
 await callAccount({op:'session',token});
 validFirst(first);
 const prepared=await callAccount({op:'prepareSeat',token,deckId});
 const open=await callAccount({op:'listOpen',token});
 const released=[];
 for(const drop of roomsToDrop(open.rooms,replaceOldest===true)){
  if(await applyDirectoryDrop(callAccount,callRoom,prepared.user.id,drop))released.push({code:drop.code,how:drop.how});
 }
 const reserved=await callAccount({op:'reserve',userId:prepared.user.id});
 try{
  const created=await callRoom(reserved.code,{op:'create',code:reserved.code,first,...prepared});
  await callAccount({op:'mark',code:reserved.code,status:created.status,updatedAt:created.updatedAt});
  return {...created.public,released};
 }catch(error){
  try{await callAccount({op:'release',code:reserved.code});}catch{/* The original error is what the player sees. */}
  throw error;
 }
}
export async function durableList(callAccount,{token}){
 return callAccount({op:'listOpen',token});
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
