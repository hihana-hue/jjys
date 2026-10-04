import {semesters,semesterLabel,normalize,isFixed,changeSelection,semesterCapacity,summary,courseMentions,recommendationKind,canonicalCourseName,guidanceCourseTokens,displayGuidanceSubjects} from './engine.mjs?v=20261004-csat-badge';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let courses=[],recs=[],selected=new Set(),semester='1-1',activeRec=null,toastTimer;const storageKey='youngsaeng-course-draft-v1';let storageAvailable=true;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();const uniQuery=s=>normalize(s).replace(/대학교/g,'대').replace(/[()（）·]/g,'').replace(/연세미래/g,'연세대미래').replace(/미래캠퍼스/g,'미래').replace(/연세대원주/g,'연세대미래');
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({selected:[...selected],semester,rec:activeRec?.id||null}));$('saveStatus').textContent='이 기기에 자동 저장됨';}catch{$('saveStatus').textContent='자동 저장 불가 · 선택표를 저장해 주세요';storageAvailable=false;}}
function restore(){try{const raw=localStorage.getItem(storageKey);if(!raw)return;const state=JSON.parse(raw);if(!state||!Array.isArray(state.selected))return;let skipped=false;for(const id of state.selected){try{selected=changeSelection(courses,selected,id,true);}catch{skipped=true;}}if(semesters.includes(state.semester))semester=state.semester;if(skipped)toast('현재 편성표와 맞지 않는 저장 과목을 제외했습니다.');return state.rec;}catch{storageAvailable=false;$('saveStatus').textContent='자동 저장 불가 · 선택표를 저장해 주세요';}}
const csatCourses=new Set(['화법과언어','독서와작문','문학','대수','미적분I','확률과통계','영어I','영어II','한국사','한국사1','한국사2','통합사회','통합사회1','통합사회2','통합과학','통합과학1','통합과학2']);
const isCsat=name=>csatCourses.has(String(name).replace(/Ⅰ/g,'I').replace(/Ⅱ/g,'II').replace(/\s/g,''));
const csatBadge=name=>isCsat(name)?'<span class="csat-badge" title="첨부된 수능 출제 과목 목록 기준">★수능</span>':'';
const names=()=>[...new Set(courses.map(x=>x.name))];
function kind(s){return recommendationKind(activeRec,s.name,names());}
function drawTabs(){const data=summary(courses,selected);$('semesterTabs').innerHTML=semesters.map(k=>{const groups=data.groups.filter(g=>courses.some(s=>s.selectGroup===g.key&&s.semesters[k]>0));const picked=groups.reduce((n,g)=>n+g.count,0),needed=groups.reduce((n,g)=>n+g.need,0);return `<button type="button" data-sem="${k}" class="${k===semester?'active':''}" aria-current="${k===semester?'page':'false'}">${semesterLabel(k)}<small title="고른 과목 수 / 골라야 할 과목 수">${picked} / ${needed}개 선택</small></button>`;}).join('');}

function renderCourses(){drawTabs();$('semesterTitle').textContent=semesterLabel(semester);$('semesterCredit').textContent=summary(courses,selected).semesters[semester];$('recommendedOnly').disabled=!activeRec;
 const all=courses.filter(s=>s.semesters[semester]>0);const groupKeys=[...new Set(all.map(s=>s.selectGroup))].sort((a,b)=>a==='지정'?-1:b==='지정'?1:parseInt(a.slice(2))-parseInt(b.slice(2)));
 const query=canonicalCourseName($('courseSearch').value);const only=$('recommendedOnly').checked&&activeRec;let visible=0;
 $('courseGroups').innerHTML=groupKeys.map(g=>{const group=all.filter(s=>s.selectGroup===g),filtered=group.filter(s=>(!query||canonicalCourseName(s.name).includes(query)||normalize(s.group).includes(query))&&(!only||kind(s)));if(!filtered.length)return '';visible+=filtered.length;const fixed=g==='지정',count=group.filter(s=>selected.has(s.id)).length,need=group[0].chooseCount;
 return `<section class="group"><div class="group-header"><div><h3>${fixed?'학교 지정 과목':esc(g)}</h3><p>${fixed?'모든 학생이 이수 · 학점에 자동 포함':`${need}과목 선택${new Set(group.map(s=>s.credit)).size>1?' · 과목마다 학점이 다릅니다':''}`}</p></div><span class="group-count ${fixed||count===need?'complete':''}">${fixed?group.length+'과목':count+' / '+need}</span></div><div class="cards">${filtered.map(s=>{const picked=fixed||selected.has(s.id),k=kind(s),branch=s.name==='세포와 물질대사'?'생명과학':s.branch;return `<label class="course-card ${fixed?'fixed':picked?'selected':''}">${fixed?'<span class="fixed-icon" aria-hidden="true">✓</span>':`<input type="checkbox" data-id="${s.id}" ${picked?'checked':''} aria-label="${esc(s.name)} ${s.credit}학점 선택">`}<div class="course-body"><div class="course-top"><span class="course-name">${esc(s.name)}${csatBadge(s.name)}</span><span class="credit">${s.semesters[semester]}학점</span></div><div class="course-meta"><span class="subject-area" data-area="${esc(s.group)}">${esc(s.group)}</span>${branch?`<span>${esc(branch)}</span>`:''}<span>${esc(s.type.replace(/ 과목$/,''))}</span>${k?`<span class="tag ${k==='핵심'?'core':k==='권장'?'recommended':'common'}">대학 ${k}</span>`:''}</div></div></label>`;}).join('')}</div></section>`;}).join('');
 if(!visible)$('courseGroups').innerHTML='<div class="empty">이 학기에 해당하는 과목이 없습니다.<br>검색어 또는 대학 안내 과목 필터를 확인해 주세요.</div>';
}
function status(data){const incomplete=data.groups.filter(g=>g.count!==g.need),short=data.required.filter(r=>r.credit<r.min);const messages=[];if(incomplete.length)messages.push(`선택그룹 ${incomplete.length}개 미완료`);if(data.total<174)messages.push(`교과 ${174-data.total}학점 부족`);if(data.kem>81)messages.push(`국영수 ${data.kem-81}학점 초과`);if(short.length)messages.push(`최소학점 미달 ${short.length}개 교과군`);return messages;}
function renderSummary(){const d=summary(courses,selected);$('totalCredit').textContent=d.total;$('totalProgress').style.width=Math.min(d.total/174*100,100)+'%';$('totalNote').textContent=d.total<174?`${174-d.total}학점 부족`:'174학점 이상 충족';$('groupComplete').textContent=`${d.groups.filter(g=>g.count===g.need).length} / ${d.groups.length}`;$('kemCredit').textContent=`${d.kem} / 81학점`;$('socialCredit').textContent=subjectCredit(d,'사회')+'학점';$('scienceCredit').textContent=subjectCredit(d,'과학')+'학점';
 const messages=status(d);$('checkStatus').className='check-status'+(messages.length?'':' good');$('checkStatus').textContent=messages.length?messages.slice(0,2).join(' · '):'학점 기준 충족';
 $('requiredCredits').innerHTML=d.required.map(r=>`<div class="required-row ${r.credit>=r.min?'pass':'fail'}"><span>${esc(r.key)}</span><strong>${r.credit>=r.min?'✓ ':''}${r.credit} / ${r.min}</strong></div>`).join('');}
function render(){renderCourses();renderSummary();renderRecommendation();if($('planDialog').open)renderPlan();}
function choose(id,checked){selected=changeSelection(courses,selected,id,checked);save();render();return {selected:[...selected],total:summary(courses,selected).total};}
function search(){const u=uniQuery($('university').value),q=normalize($('department').value);if(!u&&!q){$('searchResults').innerHTML='<p class="muted-msg">대학명 또는 학과·계열을 입력해 주세요.</p>';return [];}
 const found=recs.filter(r=>(!u||uniQuery(r.univ).includes(u))&&(!q||normalize([r.college,r.dept,...(r.aliases||[])].join(' ')).includes(q)));const limit=u||q?200:40,shown=found.slice(0,limit);
 $('searchResults').innerHTML=`<div class="result-info"><span>${found.length?`${found.length}개 결과${found.length>limit?` · 첫 ${limit}개 표시, 학과명으로 좁혀 주세요`:''}`:'이 배포 자료에 일치하는 정보가 없습니다. 대학 입학처 안내를 확인해 주세요.'}</span><button type="button" class="text-button" id="hideResults">닫기</button></div>${shown.length?`<div class="results">${shown.map(r=>`<button type="button" class="result ${activeRec?.id===r.id?'active':''}" data-rec="${r.id}" aria-pressed="${activeRec?.id===r.id}"><strong>${esc(clean(r.univ))} · ${esc(clean(r.dept||r.college))}</strong><span>${esc(clean(r.dept?r.college:r.area))}</span></button>`).join('')}</div>`:''}`;return found;}
function renderRecommendation(){if(!activeRec){$('recommendation').innerHTML='';return;}const r=activeRec;const allNames=names();const matched=[...new Set(['core','recommended','common','note'].flatMap(key=>courseMentions(r[key],allNames)))];const pickedNames=summary(courses,selected).picked.map(s=>s.name);
 const rawKeys=[['core','핵심과목'],['recommended','권장과목'],['common',['not-designated','not-published','unverified'].includes(r.guidanceStatus)?'권장과목 안내':'반영과목']];const content=rawKeys.filter(([key])=>r.common?key==='common':key!=='common').map(([key,label])=>`<div class="rec-section"><span class="rec-label">${label}</span><div class="raw-text">${esc(!r[key]||r[key]==='-'?'미기재':displayGuidanceSubjects(r[key]))}</div></div>`).join('');
 const broad=new Set(['국어','수학','영어','사회','과학','제2외국어/한문','체육','예술','교양']);const other=[...new Set(['core','recommended','common'].flatMap(key=>guidanceCourseTokens(r[key]).filter(t=>t&&t!=='-'&&t.length<=24&&!/[()/:：]|교과|계열|관련|이수|선택|권장|적성|진로 및|구분|미제시|미지정|미기재|미확인|공개|없음|자율/.test(t)&&!broad.has(t)&&!allNames.some(n=>canonicalCourseName(n)===canonicalCourseName(t)))))];
 $('recommendation').innerHTML=`<div class="rec-box"><div class="rec-head"><div><h3>${esc(clean(r.univ))} · ${esc(clean(r.dept||r.college))}</h3><p>${esc(clean(r.dept?r.college:r.region+' · '+r.area))}${r.sourceLabel?' · '+esc(r.sourceLabel):''}</p></div><button id="clearRec" type="button">안내 해제</button></div>${content}${r.note&&r.note!=='-'?`<div class="rec-note">비고 : ${esc(r.note)}</div>`:''}${matched.length?`<div class="rec-section"><span class="rec-label">영생고 개설 과목 · ${matched.filter(n=>pickedNames.includes(n)).length}/${matched.length}개 선택</span><div class="rec-chips">${matched.map(n=>`<span class="${pickedNames.includes(n)?'taken':''}">${pickedNames.includes(n)?'✓ ':''}${esc(n)}${csatBadge(n)}</span>`).join('')}</div>`:['not-designated','not-published','unverified'].includes(r.guidanceStatus)?'':'<p class="rec-note">개별 과목 일치 없음</p>'}${other.length?`<details class="rec-section"><summary class="rec-label">영생고 편성표에 같은 이름이 없는 과목 ${other.length}개</summary><div class="raw-text">${other.map(esc).join(', ')}</div><p class="rec-note">미개설·과목명 차이 확인 필요</p></details>`:''}</div>`;}
const subjectCredit=(d,group)=>d.picked.filter(s=>s.group===group).reduce((n,s)=>n+s.credit,0);
function renderPlan(){const d=summary(courses,selected),messages=status(d);$('planContent').innerHTML=`<div class="plan-stats"><span>교과 학점<strong>${d.total} / 174</strong></span><span>국영수<strong>${d.kem} / 81</strong></span><span>사회<strong>${subjectCredit(d,'사회')}학점</strong></span><span>과학<strong>${subjectCredit(d,'과학')}학점</strong></span><span>선택그룹<strong>${d.groups.filter(g=>g.count===g.need).length} / ${d.groups.length}</strong></span></div>${activeRec?`<p class="muted-msg">진로 참고: ${esc(clean(activeRec.univ))} · ${esc(clean(activeRec.dept||activeRec.college))}</p>`:''}<p class="plan-warning">${messages.length?esc(messages.join(' · ')):'선택그룹과 학점 점검 기준 충족'}</p><div class="plan-grid">${[1,2,3].map(year=>`<div class="plan-year">${semesters.filter(k=>Number(k[0])===year).map(k=>`<section class="plan-semester"><h3>${semesterLabel(k)} <span>${d.semesters[k]}학점</span></h3><table><caption style="position:absolute;width:1px;height:1px;overflow:hidden">${semesterLabel(k)} 선택 과목 및 학점</caption><tbody>${d.picked.filter(s=>s.semesters[k]>0).map(s=>`<tr><td>${esc(s.name)}${csatBadge(s.name)}${isFixed(s)?'<small>지정</small>':''}</td><td>${s.semesters[k]}</td></tr>`).join('')||'<tr><td colspan="2">선택한 과목 없음</td></tr>'}</tbody></table><p class="rec-note" style="padding:0 10px">${d.groups.filter(g=>g.count!==g.need&&courses.some(s=>s.selectGroup===g.key&&s.semesters[k]>0)).map(g=>`${esc(g.key)} ${g.count}/${g.need}`).join(' · ')}</p></section>`).join('')}</div>`).join('')}</div>`;}
const identityStorageKey='youngsaeng-student-identity-v1';
function studentIdentity(){return {studentNumber:$('studentNumber').value.trim(),studentName:$('studentName').value.trim()};}
function identityText(){const s=studentIdentity();return [s.studentNumber?'학번: '+s.studentNumber:'',s.studentName?'이름: '+s.studentName:''].filter(Boolean).join(' · ');}
function pdfFilename(){const s=studentIdentity();const parts=[s.studentNumber,s.studentName].filter(Boolean).map(v=>v.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_'));return parts.length?parts.join('_')+'_과목선택표.pdf':'영생고_나의_선택표.pdf';}
try{const s=JSON.parse(localStorage.getItem(identityStorageKey)||'{}');$('studentNumber').value=String(s.studentNumber||'').replace(/\D/g,'').slice(0,5);$('studentName').value=String(s.studentName||'').slice(0,30);}catch{}
for(const id of ['studentNumber','studentName'])$(id).addEventListener('input',()=>{if(id==='studentNumber')$(id).value=$(id).value.replace(/\D/g,'').slice(0,5);try{localStorage.setItem(identityStorageKey,JSON.stringify(studentIdentity()));}catch{toast('학번·이름 자동 저장이 불가능합니다. PDF에는 입력한 내용이 표시됩니다.');}});
function openPlan(){renderPlan();$('planDialog').showModal();}

let printRoot=null,restorePlanDialog=false;
function preparePrint(){
 if(printRoot)return;
 renderPlan();
 restorePlanDialog=$('planDialog').open;
 if(restorePlanDialog)$('planDialog').close();
 printRoot=document.createElement('section');
 printRoot.id='coursePrintDocument';
 const style=document.createElement('style');
 style.textContent=`
 #coursePrintDocument{display:none}
 @media print{
  body> :not(#coursePrintDocument){display:none!important}
  #coursePrintDocument{display:block!important;color:#20324c;background:white;font-size:11px}
  #coursePrintDocument h1{font-size:22px;margin:0 0 12px}
  #coursePrintDocument .plan-grid{display:block;margin-top:14px}
  #coursePrintDocument .plan-year{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;break-inside:avoid;margin-bottom:12px}
  #coursePrintDocument .plan-semester{margin-bottom:12px;break-inside:avoid;overflow:visible}
  #coursePrintDocument .plan-semester h3{font-size:13px;padding:7px 10px}
  #coursePrintDocument .plan-semester td{padding:4px 10px}
  #coursePrintDocument .plan-stats{padding:8px 12px}
  #coursePrintDocument p{margin:6px 0}
  @page{size:A4;margin:12mm}
 }`;
 printRoot.append(style);
 const title=document.createElement('h1');title.textContent='영생고 나의 전체 선택표';printRoot.append(title);
 if(identityText()){const student=document.createElement('p');student.textContent=identityText();printRoot.append(student);}
 const content=document.createElement('div');content.innerHTML=$('planContent').innerHTML;printRoot.append(content);
 document.body.append(printRoot);
}
function finishPrint(){
 printRoot?.remove();printRoot=null;
 if(restorePlanDialog&&!$('planDialog').open)$('planDialog').showModal();
 restorePlanDialog=false;
}

function printPlan(){
 try{preparePrint();window.print();}catch{finishPrint();toast('인쇄를 지원하지 않는 브라우저입니다. PDF 저장을 이용해 주세요.');}

}
window.addEventListener('beforeprint',preparePrint);
window.addEventListener('afterprint',finishPrint);
function offerFile(blob,filename){
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=filename;link.hidden=true;document.body.append(link);
 link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function sharePlan(){
 try{
  const blob=planPdf(),filename=pdfFilename(),file=new File([blob],filename,{type:'application/pdf'});
  if(navigator.canShare?.({files:[file]})){
   try{await navigator.share({files:[file]});}
   catch(error){if(error.name==='AbortError')return;offerFile(blob,filename);}
  }else offerFile(blob,filename);
 }catch{toast('선택표 파일을 만들지 못했습니다. PDF 저장을 다시 시도해 주세요.');}
}
// A self-contained PDF with a high-resolution Korean canvas image; no print dialog or external library.
function planPdf(){
 const d=summary(courses,selected),c=document.createElement('canvas');c.width=1240;c.height=1754;
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 const text=(s,px,py,size=20,bold=false)=>{x.font=(bold?'600 ':'')+size+'px -apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif';x.fillStyle='#20324c';x.fillText(s,px,py);};
 const fit=(s,width,size=20)=>{x.font=size+'px -apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif';while(x.measureText(s).width>width&&size>12){size--;x.font=size+'px -apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif';}return size;};
 text('영생고 나의 전체 선택표',55,75,34,true);
 const identity=identityText();if(identity)text(identity,55,120,fit(identity,1120,22));
 const totals='교과 '+d.total+' / 174학점  ·  국영수 '+d.kem+' / 81학점  ·  사회 '+subjectCredit(d,'사회')+'학점  ·  과학 '+subjectCredit(d,'과학')+'학점  ·  선택그룹 '+d.groups.filter(g=>g.count===g.need).length+' / '+d.groups.length;
 text(totals,55,identity?156:120,fit(totals,1120,20));
 let y=identity?196:160;
 if(activeRec){const title='진로 참고: '+clean(activeRec.univ)+' · '+clean(activeRec.dept||activeRec.college);text(title,55,y,fit(title,1120));y+=38;}
 const warning=status(d).join(' · ')||'선택그룹과 학점 점검 기준 충족';text(warning,55,y,fit(warning,1120,18));y+=36;
 for(const year of [1,2,3]){
  const pair=semesters.filter(k=>Number(k[0])===year),lists=pair.map(k=>d.picked.filter(s=>s.semesters[k]>0));
  const rowCount=Math.max(1,...lists.map(list=>list.length)),height=62+rowCount*31+34;
  pair.forEach((k,j)=>{
   const left=55+j*580,width=550;x.fillStyle='#f3f6fb';x.fillRect(left,y,width,48);
   text(semesterLabel(k),left+14,y+32,23,true);text(d.semesters[k]+'학점',left+width-92,y+32,20);
   x.strokeStyle='#dce3ed';x.strokeRect(left,y,width,height);
   const list=lists[j];(list.length?list:[null]).forEach((s,n)=>{
    const top=y+48+n*31;x.strokeStyle='#edf0f5';x.beginPath();x.moveTo(left,top+31);x.lineTo(left+width,top+31);x.stroke();
    const label=s?s.name+(isCsat(s.name)?' ★수능':'')+(isFixed(s)?' (지정)':''):'선택한 과목 없음';text(label,left+14,top+23,fit(label,width-85));
    if(s)text(String(s.semesters[k]),left+width-38,top+23);
   });
   const incomplete=d.groups.filter(g=>g.count!==g.need&&courses.some(s=>s.selectGroup===g.key&&s.semesters[k]>0)).map(g=>g.key+' '+g.count+'/'+g.need).join(' · ');
   if(incomplete)text(incomplete,left+14,y+height-12,fit(incomplete,width-28,16));
  });y+=height+22;
 }
 text('전주영생고등학교 · '+new Date().toLocaleDateString('ko-KR'),55,1708,17);
 const jpeg=Uint8Array.from(atob(c.toDataURL('image/jpeg',0.94).split(',')[1]),v=>v.charCodeAt(0));
 const enc=new TextEncoder(),parts=[],offsets=[0];let length=0;
 const put=v=>{const bytes=typeof v==='string'?enc.encode(v):v;parts.push(bytes);length+=bytes.length;};
 const obj=(id,body)=>{offsets[id]=length;put(id+' 0 obj\n'+body+'\nendobj\n');};
 put('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
 offsets[4]=length;put('4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');put(jpeg);put('\nendstream\nendobj\n');
 const stream='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';obj(5,'<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'endstream');
 const cross=length;put('xref\n0 6\n0000000000 65535 f \n');for(let n=1;n<=5;n++)put(String(offsets[n]).padStart(10,'0')+' 00000 n \n');
 put('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+cross+'\n%%EOF');
 return new Blob(parts,{type:'application/pdf'});
}
function downloadPdf(){try{offerFile(planPdf(),pdfFilename());}catch{toast('PDF를 만들지 못했습니다. 인쇄를 이용해 주세요.');}}
$('semesterTabs').addEventListener('click',e=>{const b=e.target.closest('[data-sem]');if(!b)return;semester=b.dataset.sem;$('courseSearch').value='';save();renderCourses();});
$('courseGroups').addEventListener('change',e=>{if(!e.target.dataset.id)return;try{choose(e.target.dataset.id,e.target.checked);}catch(error){e.target.checked=selected.has(e.target.dataset.id);toast(error.message);}});
$('courseSearch').addEventListener('input',renderCourses);$('recommendedOnly').addEventListener('change',renderCourses);
$('searchForm').addEventListener('submit',async e=>{e.preventDefault();try{await recommendationReady;search();}catch{$('searchResults').innerHTML='<p class="muted-msg">대학 자료를 불러오지 못했습니다. 인터넷 연결을 확인하고 페이지를 새로고침해 주세요.</p>';}});
$('searchResults').addEventListener('click',e=>{const b=e.target.closest('[data-rec]');if(b){activeRec=recs.find(r=>r.id===b.dataset.rec);save();render();for(const item of $('searchResults').querySelectorAll('[data-rec]')){const chosen=item.dataset.rec===activeRec.id;item.classList.toggle('active',chosen);item.setAttribute('aria-pressed',String(chosen));}}if(e.target.closest('#hideResults'))$('searchResults').innerHTML='';});
$('recommendation').addEventListener('click',e=>{if(e.target.closest('#clearRec')){activeRec=null;$('recommendedOnly').checked=false;save();render();$('searchResults').innerHTML='';}});
$('openPlan').onclick=openPlan;$('reviewPlan').onclick=openPlan;$('closePlan').onclick=()=>$('planDialog').close();$('planDialog').addEventListener('click',e=>{if(e.target===$('planDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});$('printPlan').onclick=printPlan;$('downloadPdf').onclick=downloadPdf;$('sharePlan').onclick=sharePlan;
$('clearPlan').onclick=()=>{if(!selected.size){toast('초기화할 선택 과목이 없습니다.');return;}if(confirm('선택한 모든 학기의 과목을 초기화할까요? 학교 지정 과목은 유지됩니다.')){selected=new Set();save();render();toast('선택 과목을 초기화했습니다.');}};
async function loadJson(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('자료 요청 실패');return r.json();}
let savedRec;
const recommendationReady=loadJson('./data/recommendations.json?v=20261004-csat-badge').then(data=>{recs=data;$('dbCount').textContent=`어디가 · ${new Set(data.map(r=>r.univ)).size}개 대학·캠퍼스 · ${data.length.toLocaleString()}행`;$('universityList').innerHTML=[...new Set(recs.map(r=>clean(r.univ)))].sort((a,b)=>a.localeCompare(b,'ko')).map(u=>`<option value="${esc(u)}">`).join('');if(savedRec){activeRec=recs.find(r=>r.id===savedRec)||null;render();}return data;});recommendationReady.catch(()=>{$('dbCount').textContent='대학 자료 로딩 실패';});
try{courses=await loadJson('./data/courses.json');savedRec=restore();render();await recommendationReady;if(savedRec&&!activeRec){activeRec=recs.find(r=>r.id===savedRec)||null;render();}registerTools();}catch(error){if(!courses.length){$('courseGroups').innerHTML='<div class="empty">학교 과목 데이터를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.</div>';}}
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();const register=t=>{try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_course_plan',description:'Read the school courses, selected choices, semester and credit checks in the current draft.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({semester,selected:[...selected],summary:summary(courses,selected),courses:courses.map(s=>({id:s.id,name:s.name,group:s.selectGroup,credits:s.credit,semesters:s.semesters}))})});
 register({name:'navigate_semester',description:'Open a semester tab without changing course selections.',inputSchema:{type:'object',properties:{semester:{type:'string',enum:semesters}},required:['semester'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!semesters.includes(input.semester))throw Error('유효한 학기를 입력해 주세요.');semester=input.semester;$('courseSearch').value='';save();renderCourses();return {semester};}});
 register({name:'set_course_selections',description:'Apply a batch of course selections to the visible draft. Enforces group limits and duplicate-course rules. All changes succeed together or none are applied.',inputSchema:{type:'object',properties:{changes:{type:'array',items:{type:'object',properties:{id:{type:'string'},selected:{type:'boolean'}},required:['id','selected'],additionalProperties:false}}},required:['changes'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!Array.isArray(input.changes)||input.changes.length>120)throw Error('과목 변경 목록을 확인해 주세요.');let next=new Set(selected);for(const c of input.changes){if(!c||typeof c.id!=='string'||typeof c.selected!=='boolean')throw Error('잘못된 과목 변경입니다.');next=changeSelection(courses,next,c.id,c.selected);}selected=next;save();render();return {selected:[...selected],total:summary(courses,selected).total};}});
 register({name:'search_university_guidance',description:'Search the official university guidance snapshot and show results. Does not select a guidance record or alter courses.',inputSchema:{type:'object',properties:{university:{type:'string'},department:{type:'string'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{if(!input||Object.values(input).some(v=>typeof v!=='string'))throw Error('검색어는 문자열이어야 합니다.');$('university').value=input.university||'';$('department').value=input.department||'';return search().slice(0,40);}});
 register({name:'show_university_guidance',description:'Display a guidance record and highlight literal matching school courses. Keeps the course draft unchanged.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{const r=recs.find(r=>r.id===input?.id);if(!r)throw Error('자료 항목을 확인해 주세요.');activeRec=r;save();render();return r;}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
