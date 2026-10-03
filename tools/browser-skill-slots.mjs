import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 await page.evaluate(()=>{const g=window.__game,p=g.player;g.entities=[p];g.ecology.timer=g.allyLinks.timer=10000;p.color='green';p.colorHex='#22c55e';p.size=120;p.attackState=p.dodgeState='READY';p.apex=false;p.frozen=0;p.normalSkillCooldown=p.specialCooldown=0;g.paused=false;const ctx=g.ctx??document.querySelector('canvas').getContext('2d'),original=ctx.fillText.bind(ctx);window.skillLabels=[];ctx.fillText=(label,...args)=>{if(/^[ER] [◆◇\d]/.test(label)){window.skillLabels.push(label);if(window.skillLabels.length>100)window.skillLabels.shift();}original(label,...args);};});
 await page.waitForTimeout(120);assert.equal(await page.locator('#touch-special').isEnabled(),true);assert.equal(await page.locator('#touch-ultimate').isEnabled(),false);assert(await page.evaluate(()=>window.skillLabels.includes('E ◆')));
 await page.keyboard.press('e');await page.waitForFunction(()=>window.__game.abilities.events.some(e=>e.type==='special-fire'&&e.slot==='E'));assert((await page.locator('#touch-special').innerText()).includes('E'));assert(await page.locator('#touch-special').isDisabled());
 await page.evaluate(()=>{const p=window.__game.player;p.apex=true;p._specialApex=true;p.specialCooldown=0;});await page.waitForTimeout(100);assert(await page.locator('#touch-ultimate').isEnabled());await page.keyboard.press('r');await page.waitForFunction(()=>window.__game.entities.filter(e=>e.summoned).length===2);await page.evaluate(()=>{window.__game.player.specialCooldown=0;});await page.waitForTimeout(100);await page.locator('#touch-ultimate').tap();await page.waitForFunction(()=>window.__game.abilities.specialFires>=3);assert(await page.evaluate(()=>window.__game.player.specialCooldown>0&&window.__game.player.normalSkillCooldown>0));
 await page.screenshot({path:'reports/M42-mobile-landscape.png'});
 await page.keyboard.press('F1');await page.locator('#debug-panel details').filter({hasText:'E/R 스킬 후보 교체'}).locator('summary').click();await page.locator('[data-skill-slot="green-R"]').selectOption('green-morale');assert.equal(await page.evaluate(()=>window.__game.balance.abilitySkills.loadout.green.R),'green-morale');await page.locator('[data-skill-slot="green-R"]').selectOption('green-summon');await page.keyboard.press('F1');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);const box=await page.locator('#touch-actions').boundingBox();assert(box.x>=0&&box.x+box.width<=390&&box.height<150);await page.screenshot({path:'reports/M42-mobile-portrait.png'});assert.deepEqual(errors,[]);
 const result={result:'PASS',normalUnlock:true,characterReadyCue:true,keyboardE:true,keyboardR:true,touchR:true,independentCooldowns:true,summons:2,candidateRestore:true,portraitActionBounds:box,errors};writeFileSync('reports/M42-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
