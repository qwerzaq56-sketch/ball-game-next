import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const prefix=process.env.BROWSER_PLAY_REPORT_PREFIX??'reports/M9';
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(process.argv[2]??'http://127.0.0.1:8001/');await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();
 await page.keyboard.press('p');await page.waitForFunction(()=>window.__game.paused);
 let time=await page.evaluate(()=>window.__game.gameTime);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__game.gameTime),time);assert(await page.locator('#pause-indicator').isVisible());
 await page.keyboard.press('h');assert(await page.locator('#play-help').isVisible());assert.match(await page.locator('#play-help').innerText(),/흡수·전투·최상위/);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__game.paused),true);
 await page.locator('#pause-btn').click();await page.waitForFunction(()=>!window.__game.paused);await page.waitForTimeout(100);assert((await page.evaluate(()=>window.__game.gameTime))>time);
 await page.locator('#help-btn').click();time=await page.evaluate(()=>window.__game.gameTime);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__game.gameTime),time);
 // M30 makes Space activate a focused button; test gameplay keys on the dialog itself.
 await page.locator('#play-help').evaluate(el=>{el.tabIndex=-1;el.focus();});
 await page.keyboard.press('e');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__game.input._specialQueued),false);assert.equal(await page.evaluate(()=>window.__game.input._dodgeQueued),false);
 await page.screenshot({path:`${prefix}-play-help.png`});
 await page.locator('#help-close').click();await page.waitForFunction(()=>!window.__game.paused);
 // R-VIS-010: settings live in the ☰ menu, which pauses like help and restores the previous pause state
 await page.locator('#menu-btn').click();assert(await page.locator('#hud-menu').evaluate(d=>d.open));assert.equal(await page.evaluate(()=>window.__game.paused),true,'menu pauses');
 await page.keyboard.press('Escape');await page.waitForTimeout(80);assert.equal(await page.locator('#hud-menu').evaluate(d=>d.open),false);assert.equal(await page.evaluate(()=>window.__game.paused),false,'closing the menu resumes');
 await page.keyboard.press('m');assert(await page.locator('#hud-menu').evaluate(d=>d.open),'M opens the menu');await page.mouse.click(20,700);await page.waitForTimeout(80);assert.equal(await page.locator('#hud-menu').evaluate(d=>d.open),false,'backdrop click closes');assert.equal(await page.evaluate(()=>window.__game.paused),false);
 await page.locator('#menu-btn').click();await page.locator('#reset-btn').click();assert.equal(await page.locator('#hud-menu').evaluate(d=>d.open),false,'reset closes the menu');time=await page.evaluate(()=>window.__game.gameTime);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__game.gameTime),time);await page.keyboard.press('p');assert.equal(await page.evaluate(()=>window.__game.paused),true);
 await page.locator('#reset-confirm-no').click();await page.waitForFunction(()=>!window.__game.paused);
 await page.keyboard.press('p');await page.locator('#menu-btn').click();await page.locator('#reset-btn').click();await page.locator('#reset-confirm-no').click();assert.equal(await page.evaluate(()=>window.__game.paused),true);
 await page.locator('#menu-btn').click();await page.locator('#ally-links-toggle').click();assert.equal(await page.locator('#ally-links-toggle').getAttribute('aria-pressed'),'false');await page.keyboard.press('Escape');await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.__game.paused),true,'the menu keeps an earlier pause');
 await page.reload();await page.waitForFunction(()=>window.__game);await page.locator('#player-start').click();assert.equal(await page.evaluate(()=>window.__game.showAllyLinks),false);
 await page.evaluate(()=>{const g=window.__game;g.paused=true;const p=g.player,a=g.entities.find(e=>e.behavior==='ai');g.entities=[p,a];a.color=p.color;a.x=p.x+80;a.y=p.y;g.allyLinks.refresh();g.allyLinks.join(a,p);p.apex=true;p.specialCooldown=0;});await page.waitForTimeout(150);
 await page.keyboard.press('u');await page.waitForTimeout(80);/* detail HUD */assert.match(await page.locator('#ally-link-status').innerText(),/2명 대열/);assert.match(await page.locator('#special-text').innerText(),/E /);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
 const rect=await page.locator('#hud').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=390&&rect.y+rect.height<800);await page.screenshot({path:`${prefix}-mobile-hud.png`});
 await page.locator('#help-btn').evaluate(e=>e.click());await page.waitForTimeout(100);const help=await page.locator('#play-help').boundingBox();assert(help.x>=0&&help.y>=0&&help.x+help.width<=390&&help.y+help.height<=844);await page.screenshot({path:`${prefix}-mobile-help.png`});
 await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',pause:true,modalPauseRestore:true,resetPause:true,queuedInputCleared:true,linksPersisted:true,peacefulHUD:true,mobile:true,errors}));
} finally {await browser.close();}
