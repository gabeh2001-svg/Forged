/* Swell label reader: runs Tesseract (open source, Apache 2.0) on the phone. Nothing leaves the device. */
let M=null,api=null;
const simd=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]))}catch(e){return false}};
self.onmessage=async e=>{const m=e.data;
 try{
  if(m.t==='init'){
   if(!api){importScripts(simd()?'tesseract-core-simd-lstm.wasm.js':'tesseract-core-lstm.wasm.js');
    M=await TesseractCore({});let r=await fetch('eng.traineddata').catch(()=>null);if(!r||!r.ok)r=await fetch('eng-traineddata.wasm');/* the Claude preview can only host the model under this name */if(!r.ok)throw Error('data '+r.status);
    M.FS.writeFile('/eng.traineddata',new Uint8Array(await r.arrayBuffer()));
    api=new M.TessBaseAPI();if(api.Init(null,'eng',1)===-1)throw Error('init');
    api.SetVariable('user_defined_dpi','300')}
   self.postMessage({t:'ready'});return}
  if(m.t==='read'){
   M.FS.writeFile('/input',new Uint8Array(m.png));api.SetVariable('tessedit_pageseg_mode',String(m.psm||6));
   if(api.SetImageFile(1,0)===1)throw Error('image');api.Recognize(null);
   const ri=api.GetIterator(),L=M.RIL_WORD,W=[];ri.Begin();
   do{if(ri.IsAtBeginningOf(L)){const t=ri.GetUTF8Text(L);if(t&&t.trim())W.push({text:t,confidence:ri.Confidence(L),bbox:ri.getBoundingBox(L)})}}while(ri.Next(L));
   api.Clear();try{M.FS.unlink('/input')}catch(_){}
   self.postMessage({t:'words',id:m.id,words:W});return}
 }catch(err){self.postMessage({t:'err',id:m.id,msg:String(err&&err.message||err)})}};
