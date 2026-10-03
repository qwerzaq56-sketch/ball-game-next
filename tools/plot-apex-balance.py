import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
load=lambda name:json.loads((ROOT/'reports'/name).read_text())
colors=['cyan','blue','green','red','yellow'];x=np.arange(5)
fig,axes=plt.subplots(1,3,figsize=(16,4.7))
for ax,old,new,title in [(axes[0],load('M75-duels-before.json'),load('M75-release-normal.json'),'Native AI: draw-inclusive score'),(axes[1],load('M75-war-before.json'),load('M75-release-war.json'),'War duels: draw-inclusive score')]:
 for data,offset,label in [(old,-.18,'Before'),(new,.18,'Tuned')]:ax.bar(x+offset,[r['score']*100 for r in data['overall']],.36,label=label)
 ax.axhline(50,color='black',lw=1);ax.set_xticks(x,colors);ax.set_ylim(0,100);ax.set_ylabel('Score % (draw = half)');ax.legend();ax.set_title(title)
data=load('M75-release-war.json');a=np.full((5,5),np.nan)
for i,c in enumerate(colors):
 for j,d in enumerate(colors):
  if i==j:continue
  matches=[r for r in data['matches'] if set(r['colors'])=={c,d}]
  a[i,j]=100*sum((r['wins']+r['draws']*.5) if r['colors'][0]==c else (r['losses']+r['draws']*.5) for r in matches)/sum(r['n'] for r in matches)
im=axes[2].imshow(a,vmin=0,vmax=100,cmap='RdBu');axes[2].set_xticks(x,colors);axes[2].set_yticks(x,colors);axes[2].set_xlabel('Opponent');axes[2].set_title('War matchup scores, all sizes')
for i in range(5):
 for j in range(5):
  if i!=j:axes[2].text(j,i,f'{a[i,j]:.0f}',ha='center',va='center')
fig.colorbar(im,ax=axes[2],label='%');fig.suptitle('240 mirrored duels per setting: sizes 200 / 400 / 800');fig.tight_layout();fig.savefig(ROOT/'reports/M75-duel-balance.png',dpi=160)
rows=load('M75-influence-size.json')['rows'];fig,axes=plt.subplots(1,3,figsize=(14,4.5))
for c in colors:
 sizes=sorted(set(r['size'] for r in rows));series=[[r for r in rows if r['color']==c and r['size']==s] for s in sizes]
 for ax,key in zip(axes,['mapDominance','damageFraction','pressure']):ax.plot(sizes,[max(r[key] for r in group) for group in series],marker='o',label=c)
for ax,title in zip(axes,['Max E/R potential map control %','Max E/R nominal damage / equal-size HP','Max E/R exposed-target pressure']):ax.set_title(title);ax.set_xlabel('Caster size');ax.grid(alpha=.25)
axes[0].legend();fig.suptitle('Potential coefficients; before defense; support harm=0; not observed discomfort');fig.tight_layout();fig.savefig(ROOT/'reports/M75-influence-size.png',dpi=160)
