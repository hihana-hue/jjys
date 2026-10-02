export const semesters=['1-1','1-2','2-1','2-2','3-1','3-2'];
export const semesterLabel=k=>k[0]+'학년 '+k[2]+'학기';
export const normalize=s=>String(s??'').normalize('NFKC').replace(/Ⅰ/g,'I').replace(/Ⅱ/g,'II').replace(/Ⅲ/g,'III').replace(/[\s·ㆍ]/g,'').toLowerCase();
export const isFixed=s=>s.selectGroup==='지정';
export function changeSelection(courses,selected,id,checked){
 const s=courses.find(x=>x.id===id);if(!s||isFixed(s))throw Error('선택 가능한 과목을 확인해 주세요.');
 const next=new Set(selected);if(!checked){next.delete(id);return next;}
 if(next.has(id))return next;
 const picked=courses.filter(x=>next.has(x.id));
 const duplicate=picked.find(x=>normalize(x.name)===normalize(s.name));
 if(duplicate)throw Error(`${s.name}은 이미 ${semesterLabel(semesters.find(k=>duplicate.semesters[k]>0))}에 선택했습니다.`);
 if(picked.filter(x=>x.selectGroup===s.selectGroup).length>=s.chooseCount)throw Error(`${s.selectGroup}은 ${s.chooseCount}과목까지 선택할 수 있습니다. 다른 과목을 해제한 뒤 선택해 주세요.`);
 next.add(id);return next;
}
export function semesterCapacity(courses,key){
 const offered=courses.filter(s=>s.semesters[key]>0);
 let total=offered.filter(isFixed).reduce((n,s)=>n+s.semesters[key],0);
 for(const group of new Set(offered.filter(s=>!isFixed(s)).map(s=>s.selectGroup))){
  const choices=offered.filter(s=>s.selectGroup===group);
  total+=choices.map(s=>s.semesters[key]).sort((a,b)=>b-a).slice(0,choices[0].chooseCount).reduce((n,c)=>n+c,0);
 }
 return total;
}
export function summary(courses,selected){
 const picked=courses.filter(x=>isFixed(x)||selected.has(x.id));const total=picked.reduce((n,x)=>n+x.credit,0);
 const kem=picked.filter(x=>['국어','영어','수학'].includes(x.group)).reduce((n,x)=>n+x.credit,0);
 const groups=[...new Set(courses.filter(x=>!isFixed(x)).map(x=>x.selectGroup))].map(key=>{
 const all=courses.filter(x=>x.selectGroup===key),chosen=all.filter(x=>selected.has(x.id));return {key,need:all[0].chooseCount,count:chosen.length,credit:chosen.reduce((n,x)=>n+x.credit,0),min:all[0].minCredit};});
 const required=[['국어',8],['수학',8],['영어',8],['사회',14],['과학',10],['체육',10],['예술',10],['생활·교양',16]].map(([key,min])=>({key,min,credit:picked.filter(x=>key==='생활·교양'?['기술가정/정보','제2외국어/한문','교양'].includes(x.group):x.group===key).reduce((n,x)=>n+x.credit,0)}));
 return {picked,total,kem,groups,required,semesters:Object.fromEntries(semesters.map(k=>[k,picked.reduce((n,x)=>n+(x.semesters[k]||0),0)]))};
}
export const courseAliases={'물리학':['물리'],'생물의 유전':['생물과 유전'],'생명과학':['생물','생물학'],'확률과 통계':['확률통계']};
export function courseBase(s){
 let key=normalize(s).replace(/([가-힣])(?:[1-9]|i{1,3}|iv|v)$/u,'$1');
 if(key.startsWith('공통'))key=key.slice(2);
 return key;
}
export function canonicalCourseName(s){
 let key=courseBase(s);
 for(const [name,aliases] of Object.entries(courseAliases))if([name,...aliases].some(a=>courseBase(a)===key)){key=courseBase(name);break;}
 if(key.length>=3&&key.endsWith('학'))key=key.slice(0,-1);
 return key;
}
// Course families affect guidance matching only; school rows, selection rules and credits stay separate.
export function courseMentions(text,names){
 const raw=String(text||'').normalize('NFKC').toLowerCase();
 const families=new Map();
 for(const name of [...new Set(names)]){
  const key=canonicalCourseName(name);
  if(!families.has(key))families.set(key,{names:[],forms:new Set()});
  const family=families.get(key);family.names.push(name);
  family.forms.add(courseBase(name));family.forms.add(key);
  if(key.length>=2)family.forms.add(key+'학');
  if(normalize(name).startsWith('공통'))family.forms.add('공통'+key);
  for(const [official,aliases] of Object.entries(courseAliases))if(canonicalCourseName(official)===key)for(const alias of [official,...aliases])family.forms.add(courseBase(alias));
 }
 const spans=[],found=new Set();
 for(const [key,family] of [...families].sort((a,b)=>b[0].length-a[0].length)){
  const forms=[...family.forms].sort((a,b)=>b.length-a.length);
  const letters=forms.map(t=>[...t].map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*')).join('|');
  const regex=new RegExp('(^|[^가-힣a-z0-9])((?:'+letters+')(?:\\s*(?:[1-9]|iii|ii|iv|i|v))?)(?=$|[^가-힣a-z0-9]|(?:을|를|와|과|등)(?:\\s|$)|포함)','gu');
  for(const match of raw.matchAll(regex)){
   const start=match.index+match[1].length,end=start+match[2].length;
   if(spans.some(([a,b])=>start<b&&end>a))continue;
   spans.push([start,end]);found.add(key);
  }
 }
 return [...new Set(names)].filter(n=>found.has(canonicalCourseName(n)));
}
export function recommendationKind(rec,name,names){
 if(!rec)return '';
 if(courseMentions(rec.core,names).includes(name))return '핵심';
 if(courseMentions(rec.recommended,names).includes(name))return '권장';
 if(courseMentions(rec.common,names).includes(name))return '안내';
 if(courseMentions(rec.note,names).includes(name))return '조건';
 return '';
}

// Separate subject names from grouping brackets and selection instructions.
export function guidanceCourseTokens(text){
 return String(text||'').split(/[,，\n;；]|\s+(?:또는|및)\s+/u).map(t=>t
  .replace(/^\s*[-•]?\s*(일반선택|진로선택|융합선택)\s*[:：]\s*/u,'')
  .replace(/[\[\]【】{}]/gu,'')
  .replace(/\s+중\s*(?:택\s*)?\d+\s*(?:개\s*)?과목.*$/u,'')
  .replace(/\s+중\s*택\s*\d+.*$/u,'')
  .trim()).filter(Boolean);
}
