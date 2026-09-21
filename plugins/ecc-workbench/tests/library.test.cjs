const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {query,show}=require('../scripts/library.cjs');
const index=JSON.parse(fs.readFileSync(path.join(__dirname,'../library/index.json'),'utf8'));
test('full canonical coverage without advertising hundreds of skill entrypoints',()=>{
  for(const [type,count] of Object.entries({skills:292,agents:68,commands:94})) assert.equal(index.records.filter(x=>x.type===type).length,count);
});
test('stack retrieval finds applicable Python API and testing methods',()=>{
  const results=query(index,'fastapi python testing','skills');
  assert.ok(results.some(x=>x.name==='fastapi-patterns'));
  assert.ok(results.some(x=>x.name==='python-testing'));
  assert.ok(results.every(x=>x.type==='skills'));
});
test('orchestration retrieval and exact source reader',()=>{
  assert.ok(query(index,'agentic os orchestration','skills').some(x=>x.name==='agentic-os'));
  assert.match(show(index,'skills/agentic-os'),/REFERENCE: skills\/agentic-os/);
  assert.throws(()=>show(index,'../../config.toml'),/Unknown reference/);
});
