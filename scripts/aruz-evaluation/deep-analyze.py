"""Grouped development CV and one frozen holdout evaluation; NumPy only."""
import json, hashlib, sys
from pathlib import Path
from collections import defaultdict
import numpy as np

OUT = Path(__file__).resolve().parents[2] / 'reports/aruz-evaluation/deep'
def load(split, kind='baseline'):
    items=[json.loads(s) for s in (OUT/f'{split}-{kind}.jsonl').read_text(encoding='utf-8').splitlines() if s]
    lattice=OUT/f'{split}-lattice.json'
    if kind=='baseline' and lattice.exists():
        lookup={(x['url'],x['pairIndex']):{(r['ark'],r['pat']):sum(r['costs']) for r in x['rows']} for x in json.loads(lattice.read_text(encoding='utf-8'))['items']}
        for x in items:
            if x['mode']=='plain':
                for r in x['rows']:
                    r['lattice']=lookup.get((x['url'],x['pairIndex']),{}).get((r['ark'],r['pat']),40)
    return items
def save(name, value):
    (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def score(r, method):
    if method=='baseline': return r['score']
    if method=='lex_off': return r['base']
    if method=='symmetric': return (r['base']+r['reverse'])/2
    if method=='reversed': return r['reverse']
    if method=='single1': return r['single1']
    if method=='single2': return r['single2']
    if method=='lex_normalized': return r['base']+r.get('lexNormalized',0)
    raise ValueError(method)
def candidates(item, method):
    rows=item['rows']
    # Existing lexicon can reorder only the ORIGINAL top four, never the rest.
    if method in ('baseline','lex_normalized'):
        top=[r for r in rows if 'lex' in r]
        rest=[r for r in rows if 'lex' not in r]
        return sorted(top,key=lambda r:(round(score(r,method),3),-r['freq']))+sorted(rest,key=lambda r:(round(r['base'],3),-r['freq']))
    return sorted(rows,key=lambda r:(round(score(r,method),3),-r['freq']))
def stats(items,method):
    ranked=[candidates(x,method) for x in items]
    return {'n':len(items),'correct':sum(rs[0]['correct'] for rs in ranked),
            'top3':sum(any(r['correct'] for r in rs[:3]) for rs in ranked),
            'byPoet':{p:{'n':sum(x['poet']==p for x in items),'correct':sum(rs[0]['correct'] for x,rs in zip(items,ranked) if x['poet']==p)} for p in sorted({x['poet'] for x in items})}}
def fixed_summary(items):
    return {mode:{m:stats([x for x in items if x['mode']==mode],m) for m in ('baseline','lex_off','symmetric','reversed','single1','single2','lex_normalized')} for mode in sorted({x['mode'] for x in items})}
def vec(r):
    a,b=r['d1'],r['d2'];cap=lambda v:min(v,20)
    return [(r['base']+r['reverse'])/2, r['base'], min(r['single1'],r['single2']),max(r['single1'],r['single2']),
        min(cap(a['cost']),cap(b['cost'])),max(cap(a['cost']),cap(b['cost'])),
        cap(a['hard'])+cap(b['hard']),abs(cap(a['hard'])-cap(b['hard'])),
        cap(a['soft'])+cap(b['soft']),cap(a['spen'])+cap(b['spen']),max(a['vpen'],b['vpen']),
        int(a['vid']==b['vid'] and bool(a['vid'])),2-a['fit']-b['fit'],np.log10(r['freq']+.05),len(r['pat']),
        r.get('lexNormalized',0),int('lex' in r),r.get('lattice',40),int(r.get('lattice',40)>=40)]
def top(item): return candidates(item,'lex_off')[:12]
def fit(items,reg,use_lattice=False):
    data=[top(x) for x in items]
    nf=19 if use_lattice else 17
    vectors=np.array([vec(r)[:nf] for rows in data for r in rows]);sd=np.maximum(vectors.std(axis=0),.05)
    differences=[]
    for rows in data:
        good=next((r for r in rows if r['correct']),None)
        if good:
            for bad in rows:
                if not bad['correct']: differences.append((np.array(vec(bad)[:nf])-vec(good)[:nf])/sd)
    X=np.array(differences);prior=np.zeros(len(sd));prior[0]=sd[0];w=prior.copy()
    def objective(w):return np.logaddexp(0,-X@w).mean()+reg*np.square(w-prior).sum()/2
    for _ in range(35):
        z=np.clip(X@w,-35,35);p=1/(1+np.exp(z))
        g=-X.T@p/len(X)+reg*(w-prior)
        H=(X.T*(p*(1-p)))@X/len(X)+reg*np.eye(len(w))
        step=np.linalg.solve(H,g);scale=1.;before=objective(w)
        while scale>1e-6 and objective(w-scale*step)>before:scale/=2
        w-=scale*step
        if np.linalg.norm(scale*step)<1e-7:break
    return {'sd':sd.tolist(),'w':w.tolist(),'reg':reg,'features':nf,'candidateLimit':12}
def predict(item,model):
    rows=top(item);s=np.array([vec(r)[:model['features']] for r in rows])/np.array(model['sd'])@np.array(model['w'])
    return rows[int(np.argmin(s))]
def grouped_ci(items, differences):
    by=defaultdict(list)
    for x,d in zip(items,differences):by[x['url']].append(d)
    groups=list(by.values());rng=np.random.default_rng(74021)
    boot=[np.mean([v for i in rng.integers(0,len(groups),len(groups)) for v in groups[i]])*100 for _ in range(4000)]
    return [round(float(v),2) for v in np.quantile(boot,[.025,.975])]
def compare(items,predictions):
    base=[candidates(x,'baseline')[0]['correct'] for x in items]
    new=[r['correct'] for r in predictions];diff=[int(b)-int(a) for a,b in zip(base,new)]
    return {'n':len(items),'baselineCorrect':sum(base),'correct':sum(new),'fixed':sum(not a and b for a,b in zip(base,new)),
      'regressed':sum(a and not b for a,b in zip(base,new)),'deltaPercentagePointsCI95':grouped_ci(items,diff),
      'byPoet':{p:{'n':sum(x['poet']==p for x in items),'correct':sum(b for x,b in zip(items,new) if x['poet']==p)} for p in sorted({x['poet'] for x in items})}}
def consensus(items,method='lex_off'):
    poems=defaultdict(list)
    for item in items:poems[item['url']].append(item)
    answer=[]
    for url,pairs in poems.items():
        patterns=defaultdict(list); truth={r['pat'] for r in pairs[0]['rows'] if r['correct']}
        for pair in pairs:
            by={}
            for r in candidates(pair,method):by[r['pat']]=min(by.get(r['pat'],float('inf')),score(r,method))
            for pat,s in by.items():patterns[pat].append(s)
        chosen=min(patterns,key=lambda p:sum(patterns[p])/len(patterns[p]))
        first=candidates(pairs[0],'baseline')[0]['correct']
        answer.append({'url':url,'poet':pairs[0]['poet'],'correct':chosen in truth,'firstCoupletCorrect':first,'pattern':chosen,'pairs':len(pairs)})
    return {'poems':len(answer),'correct':sum(x['correct'] for x in answer),'firstCoupletCorrect':sum(x['firstCoupletCorrect'] for x in answer),'results':answer}

def selective(items):
    results={}
    for threshold in [0,.5,1,2,3]:
        accepted=[]
        for x in items:
            rows=candidates(x,'baseline');a=rows[0];b=next(r for r in rows if r['pat']!=a['pat'])
            single_agree=all(candidates(x,m)[0]['pat']==a['pat'] for m in ['single1','single2'])
            if all(x['scanCounts']) and single_agree and b['score']-a['score']>=threshold:accepted.append(a)
        results[str(threshold)]={'total':len(items),'accepted':len(accepted),'errors':sum(not r['correct'] for r in accepted)}
    return results

if sys.argv[1]=='development':
    items=load('development');plain=[x for x in items if x['mode']=='plain']
    assert len(plain)==180 and len({x['url'] for x in plain})==90
    folds={u:int(hashlib.sha256(('deep-cv'+u).encode()).hexdigest(),16)%5 for u in {x['url'] for x in plain}}
    cv=[]
    for use_lattice in [False,True]:
      for reg in [.01,.1,1.,10.]:
        predictions=[]
        for k in range(5):
            model=fit([x for x in plain if folds[x['url']]!=k],reg,use_lattice)
            predictions.extend((x,predict(x,model)) for x in plain if folds[x['url']]==k)
        cv.append({'reg':reg,'useLattice':use_lattice,**compare([x for x,r in predictions],[r for x,r in predictions])})
    best=max(cv,key=lambda x:(x['correct'],x['reg']))
    model=fit(plain,best['reg'],best['useLattice']);save('frozen-reranker.json',model)
    summary={'baselineAblations':fixed_summary(items),'groupedCV':cv,'selectedRegularization':best['reg'],
       'consensusTwoCouplets':consensus(plain),'dataPolicy':'Whole-ghazal grouped CV; holdout results not used to choose corrections or coefficients. Original pretrained ranker/lexicon training provenance is unavailable.'}
    phonetics=load('development','phonetics')
    summary['phoneticsAblations']=fixed_summary(phonetics)
    summary['emptyScans']={kind:{mode:sum(not all(x['scanCounts']) for x in rows if x['mode']==mode) for mode in ['plain','original']} for kind,rows in [('baseline',items),('phonetics',phonetics)]}
    summary['latticeScalarAblations']={str(weight):sum(min(top(x),key=lambda r:r['base']+weight*r['lattice'])['correct'] for x in plain) for weight in [.25,.5,1,2,4]}
    summary['selectiveAnswering']=selective(plain)
    for kind in ['strict-align','combined-variants']:
        rows=load('development',kind)
        assert sum(x['mode']=='plain' for x in rows)==180, f'Incomplete {kind}'
        summary[kind]=fixed_summary(rows)
    save('development-summary.json',summary)
    print(json.dumps(summary,ensure_ascii=False,indent=2))
elif sys.argv[1] in ('holdout','external'):
    split=sys.argv[1]
    model=json.loads((OUT/'frozen-reranker.json').read_text())
    items=load(split);plain=[x for x in items if x['mode']=='plain'];assert len(plain)==(60 if split=='external' else 180)
    summary={'baselineAblations':fixed_summary(items),'learnedCorrection':compare(plain,[predict(x,model) for x in plain]),
             'consensusTwoCouplets':consensus(plain),'selectiveAnswering':selective(plain)}
    save(f'{split}-summary.json',summary);print(json.dumps({k:v for k,v in summary.items() if k!='consensusTwoCouplets'},ensure_ascii=False,indent=2))
elif sys.argv[1]=='summary':
    print(json.dumps(fixed_summary(load('development')),ensure_ascii=False,indent=2))
elif sys.argv[1]=='final':
    result={}
    for split in ['holdout','external']:
        base=[x for x in load(split) if x['mode']=='plain']; extra=load(split+'-extra')
        corpus=json.loads((OUT/f'{split}-extra-corpus.json').read_text(encoding='utf-8'))
        expected=sum(len(p['pairs']) for p in corpus['poems']);assert len(extra)==expected
        per_poem={u:[x for x in base if x['url']==u] for u in {x['url'] for x in base}}
        for x in extra:per_poem[x['url']].append(x)
        totals={str(n):consensus([x for values in per_poem.values() for x in values[:n]]) for n in [2,3,4]}
        errors=[]
        for x in base:
            rows=candidates(x,'baseline');gold=next((i+1 for i,r in enumerate(rows) if r['correct']),0)
            if not rows[0]['correct']:
                r=rows[0];errors.append({'url':x['url'],'pairIndex':x['pairIndex'],'lines':x['lines'],'gold':x['gold'],'prediction':r['ark'],'goldRank':gold,'scanCounts':x['scanCounts'],'highCostConfidence':r['summ']<1.5,'margin':rows[1]['score']-r['score']})
        result[split]={'multiCouplet':totals,'errors':errors,'shortPoems':corpus['shortPoems']}
        if split=='holdout':
            corrected=load(split,'strict-align');assert len(corrected)==360
            result[split]['strictAlignment']={}
            for mode in ['plain','original']:
                src=[x for x in load(split) if x['mode']==mode]
                by={(x['url'],x['pairIndex']):x for x in corrected if x['mode']==mode}
                result[split]['strictAlignment'][mode]=compare(src,[candidates(by[(x['url'],x['pairIndex'])],'baseline')[0] for x in src])
    save('final-analysis.json',result)
    print(json.dumps({s:{'multiCouplet':{n:{k:v for k,v in r.items() if k!='results'} for n,r in d['multiCouplet'].items()},'strictAlignment':d.get('strictAlignment'),'errors':len(d['errors'])} for s,d in result.items()},ensure_ascii=False,indent=2))
