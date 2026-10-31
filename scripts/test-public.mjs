import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { readdirSync } from 'node:fs';
const server = spawn('node_modules/.bin/next', ['start','--hostname','127.0.0.1'], {stdio:'pipe'});
let lastOutput='';
server.stdout.on('data', chunk=>{lastOutput=(lastOutput+chunk).slice(-2000);});
server.stderr.on('data', chunk=>{lastOutput=(lastOutput+chunk).slice(-2000);});
let status=1;
try {
  let ready=false;
  for(let attempt=0;attempt<120;attempt++) {
    try { if((await fetch('http://127.0.0.1:3000')).ok) {ready=true;break;} } catch {}
    if(server.exitCode!==null) break;
    await setTimeout(250);
  }
  if(!ready) throw new Error('Production server did not start: '+lastOutput);
  const files=readdirSync('tests/e2e').filter(name=>name.endsWith('.test.mjs')).map(name=>'tests/e2e/'+name);
  const test=spawn(process.execPath,['--test',...files],{stdio:'inherit',env:{...process.env,E2E_BASE_URL:'http://127.0.0.1:3000'}});
  status=await new Promise(resolve=>test.on('exit',code=>resolve(code??1)));
} finally {server.kill('SIGTERM');}
process.exitCode=status;
