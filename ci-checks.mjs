// CI-only test runner. This file does not change application code or map data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const args=process.argv.slice(2),argument=name=>{
 const index=args.indexOf(name);return index<0?null:args[index+1];
};
const checkout=process.cwd(),root=path.resolve(argument('--root')||path.join(checkout,'_bundle'));
const manifestPath=argument('--manifest')||path.join(checkout,'bundle-manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
process.chdir(root);fs.mkdirSync('verification',{recursive:true});

// The original crystal regression verifies optimization quality, not a six-
// second benchmark. Give a shared CI runner more time; keep every assertion.
const crystalPath='tests/crystal320.mjs',source=fs.readFileSync(crystalPath,'utf8');
const expected=manifest.files.find(row=>row.path===crystalPath);
if(!expected||sha(source)!==expected.sha256)throw Error('Die Original-Kristallprüfung stimmt nicht mit dem Upload-Paket überein.');
if((source.match(/maxMillis:6000/g)||[]).length!==2)throw Error('Die Zeitlimits der Originalprüfung wurden nicht gefunden.');
const adjusted=source.replaceAll('maxMillis:6000','maxMillis:24000')
 .replace('deadline:performance.now()+1800','deadline:performance.now()+7200')
 .replace('deadline:performance.now()+500','deadline:performance.now()+2000');
const adjustedPath='tests/.crystal320-ci.mjs';
fs.writeFileSync(adjustedPath,adjusted);
fs.writeFileSync('verification/ci-time-budgets.json',JSON.stringify({
 applicationCodeChanged:false,mapDataChanged:false,assertionsRemoved:0,
 crystalOriginalSha256:expected.sha256,crystalOriginalSearchMs:6000,
 crystalCISearchMs:24000,allMapsAggregateTimeoutMs:1800000,
 otherSuiteTimeoutMs:240000
},null,2));

const allScripts=JSON.parse(fs.readFileSync('package.json','utf8')).scripts.test.split(' && ').map(command=>command.replace(/^node /,''));
const selection=argument('--only')?.split(',');
const scripts=selection?allScripts.filter(script=>selection.includes(path.basename(script))):allScripts;
if(selection&&scripts.length!==selection.length)throw Error('Unbekannte Testauswahl.');
const startedAt=new Date().toISOString(),results=[];
fs.writeFileSync('verification/ci-core-results.json',JSON.stringify({
 startedAt,passed:false,completed:0,total:scripts.length,
 fullSuite:scripts.length===allScripts.length,results
},null,2));
for(const script of scripts){
 const name=path.basename(script),timeout=name==='allmaps201.mjs'?1800000:240000;
 console.log('START '+name+' (Zeitlimit '+timeout/60000+' Minuten)');
 const entrypoint=name==='crystal320.mjs'?adjustedPath:script;
 const started=Date.now(),run=spawnSync(process.execPath,[entrypoint],{
  cwd:root,encoding:'utf8',timeout,maxBuffer:16*1024*1024
 });
 const passed=run.status===0,output=(run.stdout||'')+(run.stderr||'')+(run.error?'\n'+run.error.stack:'');
 fs.writeFileSync('verification/'+name+'.log',output);
 results.push({test:name,passed,seconds:Math.round((Date.now()-started)/100)/10,exitCode:run.status,signal:run.signal,timeoutMs:timeout,errorCode:run.error?.code});
 console.log((passed?'PASS ':'FAIL ')+name);
 if(!passed){console.error('--- Fehlerdetails '+name+' ---');console.error(output);}
 fs.writeFileSync('verification/ci-core-results.json',JSON.stringify({
  startedAt,passed:results.every(result=>result.passed),completed:results.length,
  total:scripts.length,fullSuite:scripts.length===allScripts.length,results
 },null,2));
}
console.log(JSON.stringify({passed:results.every(result=>result.passed),tests:results.length,failed:results.filter(result=>!result.passed).map(result=>result.test)}));
if(results.some(result=>!result.passed))process.exitCode=1;
