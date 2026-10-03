import json, pathlib, math, os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/ball-next-mpl")
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((root/'reports/M57-current-balance.json').read_text())
bands=['20–39','40–79','80–159','160–399','400–499','500–799','800–1499','1500+']
variants=sorted({r['variant'] for r in data['runs']});colors=['#60a5fa','#4ade80']
plt.style.use('dark_background');fig,axes=plt.subplots(3,2,figsize=(15,14))
for ax in axes.flat:ax.set_facecolor('#111e30');ax.grid(alpha=.15)
def groups(v):return [g for r in data['runs'] if r['variant']==v for g in r['groups']]
def total(rows,key):return sum(r.get(key,0) for r in rows)
def stat(rows,key):
 n=total(rows,'samples');s=lambda k:total(rows,k)
 if key=='seconds':return sum(r.get('observedSeconds',r.get('elapsed',0)) for r in rows)
 if not n:return float('nan')
 if key=='time':return sum(r['samples']*(r['time']+10) for r in rows)/n
 if key=='opportunity':return s('anyOpportunities')/n*100
 if key=='risk':return s('crises')/n*100
 if key=='hp':return s('hpLostRatio')/n*100
for v,color in zip(variants,colors):
 runs=[r for r in data['runs'] if r['variant']==v];times=sorted({round(p['time'],3) for r in runs for p in r['timeline']});means=[]
 for t in times:
  values=[p['playerSize'] for r in runs for p in r['timeline'] if abs(p['time']-t)<.01];means.append(sum(values)/len(values))
 axes[0,0].plot(times,means,label=v,color=color)
 for ax,key,title,unit in [(axes[0,1],'time','When each size is observed (whole population)','Mean run time, seconds; 20s-bin estimate'),(axes[1,0],'seconds','Time spent in size bands (whole population)','Observed entity-seconds across 3 runs'),(axes[1,1],'opportunity','Any growth opportunity: food / absorb / hunt','Sufficient opportunity observations, %'),(axes[2,0],'risk','Risk exposure by size','Risk observations, %'),(axes[2,1],'hp','Actual HP loss by size','HP% lost per entity observation (~5s)')]:
  rows=groups(v);ys=[stat([r for r in rows if r['band']==b],key) for b in bands];ax.plot(range(len(bands)),ys,marker='o',color=color,label=v);ax.set_xticks(range(len(bands)),bands,rotation=22);ax.set_title(title);ax.set_ylabel(unit)
axes[0,0].set_title('Player growth over playtime');axes[0,0].set_xlabel('Playtime, seconds');axes[0,0].set_ylabel('Mean player diameter')
for ax in axes.flat:ax.legend(fontsize=9)
fig.suptitle('M57 current gameplay: blue / green start, 3 seeds each, 600 seconds\nNormal-life survival autoplay; all living entities sampled every 5s; blank = no observations',fontsize=14)
fig.tight_layout(rect=(0,0,1,.95));fig.savefig(root/'reports/M57-current-balance.png',dpi=150);fig.savefig(root/'reports/M57-current-balance.pdf')
summary=[]
for v in variants:
 rows=groups(v)
 for b in bands:
  selected=[r for r in rows if r['band']==b]
  summary.append({'variant':v,'band':b,'samples':total(selected,'samples'),**{k:None if math.isnan(val) else val for k in ['seconds','time','opportunity','risk','hp'] for val in [stat(selected,k)]}})
(root/'reports/M57-size-summary.json').write_text(json.dumps(summary,indent=2))
print('Saved M57 current balance PNG/PDF and size summary')
