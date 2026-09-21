#!/usr/bin/env node
'use strict';
// Local retrieval only. Never executes a catalog script or installs a dependency.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'library', 'index.json');
const TYPES = ['skills', 'agents', 'commands', 'rules'];
const tokens = s => String(s).toLowerCase().match(/[a-z0-9+#]+/g) || [];

function buildIndex() {
  const reviews = JSON.parse(fs.readFileSync(path.join(ROOT, 'library/review-index.json'), 'utf8'));
  const byName = new Map(reviews.skills.map(x => [x.name, x]));
  const records = [];
  for (const type of TYPES) {
    const base = path.join(ROOT, 'library', type);
    const visit = (dir) => {
      for (const entry of fs.readdirSync(dir, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
        if (entry.isSymbolicLink()) throw new Error('Library links are not supported');
        const file = path.join(dir,entry.name);
        if(entry.isDirectory()) visit(file);
        else if(entry.isFile() && entry.name.endsWith('.md') && (type !== 'skills' || path.relative(base,file).split(path.sep).length===2 && entry.name==='SKILL.md')) {
          const body = fs.readFileSync(file,'utf8');
          const name = path.relative(base,file).split(path.sep).join('/').replace(/\/SKILL\.md$|\.md$/g,'');
          const description = (body.match(/^description:\s*(.+)$/m)?.[1] || body.replace(/^---[\s\S]*?---\s*/, '').split('\n').filter(x=>x.trim()&&!x.startsWith('#')).slice(0,2).join(' ')).slice(0,750);
          const review = byName.get(name);
          records.push({type,name,description,path:path.relative(ROOT,file).split(path.sep).join('/'),sha256:crypto.createHash('sha256').update(body).digest('hex'),reviewStatus:review?.reviewStatus||'indexed-source',category:review?.category||type,search:tokens(name+' '+description+' '+body.match(/^#{1,3} .+$/gm)?.join(' ')).join(' ')});
        }
      }
    }; visit(base);
  }
  fs.writeFileSync(INDEX,JSON.stringify({schema:'ecc-library.v1',commit:'934195f955cf0da847d59fcd6f68856bce112d8b',records},null,2)+'\n');
  return {counts:Object.fromEntries(TYPES.map(t=>[t,records.filter(r=>r.type===t).length])),records:records.length};
}
function query(index, q, type, limit=8) {
  const words = [...new Set(tokens(q))];
  return index.records.filter(x=>!type||x.type===type).map(x=>({x,score:words.reduce((n,w)=>n+(tokens(x.name).includes(w)?12:0)+(tokens(x.description).includes(w)?4:0)+(x.search.split(' ').includes(w)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.x.name.localeCompare(b.x.name)).slice(0,limit).map(({x,score})=>{const {search,...result}=x;return {...result,score};});
}
function show(index, key) {
  const match = index.records.find(x=>`${x.type}/${x.name}`===key);
  if (!match) throw new Error('Unknown reference. Use an exact type/name from search.');
  const resolved = path.resolve(ROOT,match.path);
  if (!resolved.startsWith(path.join(ROOT,'library')+path.sep)) throw new Error('Reference escaped library');
  const body = fs.readFileSync(resolved,'utf8');
  if(crypto.createHash('sha256').update(body).digest('hex')!==match.sha256) throw new Error('Source drift: rebuild and review index');
  return `REFERENCE: ${key}\nREVIEW: ${match.reviewStatus}\nApply references/compatibility.md before adapting this source.\n\n`+body.slice(0,28000)+(body.length>28000?'\n[Truncated at 28000 characters; read the source path for remaining sections.]\n':'');
}
function main(args) {
  if(args[0]==='index') return console.log(JSON.stringify(buildIndex()));
  const index=JSON.parse(fs.readFileSync(INDEX,'utf8'));
  if(args[0]==='show'&&args.length===2) return console.log(show(index,args[1]));
  if(args[0]==='search'&&args[1]) {
    const type=args[2];
    if(type&&!TYPES.includes(type)) throw new Error('Type must be skills, agents, commands or rules');
    return console.log(JSON.stringify(query(index,args[1],type),null,2));
  }
  if(args[0]==='stats') return console.log(JSON.stringify({commit:index.commit,counts:Object.fromEntries(TYPES.map(t=>[t,index.records.filter(r=>r.type===t).length]))},null,2));
  throw new Error('Usage: node scripts/library.cjs search "task stack concern" [skills|agents|commands|rules] | show type/name | stats');
}
if(require.main===module) {try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={query,show};
