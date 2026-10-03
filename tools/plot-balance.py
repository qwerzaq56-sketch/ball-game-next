import json, pathlib, collections
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
base=json.load(open('reports/M41-balance.json'));recovery=json.load(open('reports/M41-recovery-balance.json'));j={**base,'runs':[r for r in base['runs'] if r['variant']=='baseline']+recovery['runs']+json.load(open('reports/M41-tuned-balance.json'))['runs']+json.load(open('reports/M41-floor-balance.json'))['runs']};variants=['baseline','M41-growth','M41-absorb95','M41-capital-A','M41-no-floor','M41'];colors=['#94a3b8','#38bdf8','#a78bfa','#fb923c','#a3e635','#34d399']
rows=[dict(r,variant=run['variant']) for run in j['runs'] for r in run['groups'] if r['type']=='ai']
def stat(rs,k):
 s=lambda f:sum(r.get(f,0) for r in rs)
 n=s('samples')
 return {'reward':s('rewardSum')/s('opportunities') if s('opportunities') else None,'hp':s('hpLostRatio')/n*100 if n else None,'opportunity':s('opportunities')/n*100 if n else None,'crisis':s('crises')/n*100 if n else None,'growth':s('actualSizeGain')/s('elapsed') if s('elapsed') else None}.get(k)
plt.style.use('dark_background');fig,axes=plt.subplots(4,2,figsize=(16,19));fig.patch.set_facecolor('#0b1220')
for ax in axes.flat:ax.set_facecolor('#111e30');ax.grid(alpha=.15)
for v,c in zip(variants,colors):
 runs=[r for r in j['runs'] if r['variant']==v]
 for field,ax,title in [('playerSize',axes[0,0],'Player size over time'),('meanSize',axes[0,1],'Living population mean size')]:
  ts=sorted(set(round(p['time']) for r in runs for p in r['timeline']));ys=[sum(p[field] for r in runs for p in r['timeline'] if round(p['time'])==t)/sum(1 for r in runs for p in r['timeline'] if round(p['time'])==t) for t in ts];ax.plot(ts,ys,color=c,label=v);ax.set_title(title);ax.set_xlabel('Gameplay seconds');ax.set_ylabel('Diameter');ax.legend()
for ax,dim,metric,title in [(axes[1,0],'band','reward','AI opportunity reward by size'),(axes[1,1],'band','hp','AI actual HP loss by size'),(axes[2,0],'personality','opportunity','AI growth opportunity exposure by personality'),(axes[2,1],'personality','crisis','AI crisis exposure by personality'),(axes[3,0],'region','opportunity','AI growth opportunity exposure by biome'),(axes[3,1],'region','crisis','AI crisis exposure by biome')]:
 keys=sorted(set(r[dim] for r in rows))
 if dim=='band':keys=[b for b in ['20–39','40–79','80–159','160–399','400+'] if b in keys]
 for z,(v,c) in enumerate(zip(variants,colors)):
  ys=[stat([r for r in rows if r['variant']==v and r[dim]==k],metric) for k in keys];ax.bar([i+(z-2.5)*.13 for i in range(len(keys))],[float('nan') if y is None else y for y in ys],width=.13,color=c,label=v)
 ax.set_xticks(range(len(keys)),keys,rotation=20);ax.set_title(title);ax.set_ylabel('Diameter gain' if metric=='reward' else 'HP% / entity / 5s' if metric=='hp' else 'Observation %');ax.legend()
for ax in axes.flat:
 if ax.get_legend(): ax.get_legend().remove()
handles,_=axes[0,0].get_legend_handles_labels();fig.legend(handles,['Before','Growth+density','Absorb95%','Capital A','No floor','Final'],loc='upper center',bbox_to_anchor=(.5,.944),ncol=3,fontsize=11)
fig.suptitle('Ball NEXT balance comparison · 3 seeds × 300s × 6 variants\nNormal-life autoplay; living AI sampled every 5s; all actual damage events',fontsize=17);fig.tight_layout(rect=(0,0,1,.91));fig.savefig('reports/M41-balance.png',dpi=150);fig.savefig('reports/M41-balance.pdf');print('Saved balance PNG/PDF')
