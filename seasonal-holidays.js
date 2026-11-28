/* Общие ежегодные праздники для игр Марка. Встраивается в HTML сборщиком. */
(function(global){
'use strict';
const DAY=86400000;
const info={
 birthday:{title:'День рождения игры',icon:'🎂',colors:['#ff72b5','#65dce8','#ffe08a'],tint:'#ffe0d0',sky:'#bbcfe9',description:'Торты, воздушные шары, крошки торта и «С днём рождения».'},
 halloween:{title:'Хэллоуин',icon:'🎃',colors:['#ff8b25','#a879ed','#a7df69'],tint:'#5a397d',sky:'#21172f',description:'Тыквы, паутина и фантики. Вертикальные модели — Дракулы, канистровый — зомби, циклонный — Франкенштейн, робот — оборотень.'},
 newyear:{title:'Новый год',icon:'🎄',colors:['#ff646b','#7be4c6','#ffe6a0'],tint:'#c4e5f0',sky:'#9bbdd7',description:'Ёлки, подарки, снег, упавшие иголки и новогодняя мелодия.'},
 easter:{title:'Пасха',icon:'🥚',colors:['#ffb8d4','#9bdeb5','#ffe7a0'],tint:'#e9f2cf',sky:'#bddbe6',description:'Собирай пасхальные яички среди цветов под весеннюю музыку.'}
};
function dayNumber(date){return Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/DAY;}
// Юлианская пасхалия, переведённая в григорианский календарь (в том числе после 2100 года).
function orthodoxEaster(year){
 const a=year%4,b=year%7,c=year%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7;
 const month=Math.floor((d+e+114)/31),day=(d+e+114)%31+1;
 const delta=Math.floor(year/100)-Math.floor(year/400)-2;
 const utc=new Date(Date.UTC(year,month-1,day+delta));
 return new Date(utc.getUTCFullYear(),utc.getUTCMonth(),utc.getUTCDate());
}
function dates(year,birthday){return [
 {id:'newyear',date:new Date(year,0,1)}, {id:'easter',date:orthodoxEaster(year)},
 {id:'birthday',date:new Date(year,birthday.month-1,birthday.day)}, {id:'halloween',date:new Date(year,9,31)}
];}
function activeAt(date,birthday){
 const today=dayNumber(date);
 return [date.getFullYear()-1,date.getFullYear()].flatMap(y=>dates(y,birthday)).filter(x=>x.id!=='birthday'||x.date.getFullYear()>birthday.year)
 .filter(x=>today>=dayNumber(x.date)&&today<dayNumber(x.date)+7).sort((a,b)=>b.date-a.date)[0]||null;
}
function nextDate(id,date,birthday){
 const current=activeAt(date,birthday);if(current?.id===id)return current.date;
 return [date.getFullYear(),date.getFullYear()+1,date.getFullYear()+2].flatMap(y=>dates(y,birthday))
 .find(x=>x.id===id&&dayNumber(x.date)>=dayNumber(date)&&(id!=='birthday'||x.date.getFullYear()>birthday.year)).date;
}
function create(options){
 const {THREE,scene,birthday}=options;let active=activeAt(new Date(),birthday)?.id||null;
 let decorations=null,painted=[],paintedSky=[],hiddenSky=[],lastRoom=null,lastTrack=null,elapsed=0;const players=new Map();
 const api={onChange:null,info,orthodoxEaster,activeAt:date=>activeAt(date,birthday),dates:y=>dates(y,birthday),get id(){return active;},get birthday(){return birthday;}};
 const color=c=>new THREE.Color(c);
 function material(c,glow=false){return new THREE.MeshStandardMaterial({color:c,roughness:.48,metalness:.03,emissive:glow?c:0,emissiveIntensity:glow?.7:0});}
 function mesh(parent,geometry,mat,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const sphere=(g,r,m,x,y,z)=>mesh(g,new THREE.SphereGeometry(r,16,12),m,x,y,z);
 const box=(g,w,h,d,m,x,y,z)=>mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(g,r1,r2,h,m,x,y,z)=>mesh(g,new THREE.CylinderGeometry(r1,r2,h,20),m,x,y,z);
 function rod(g,a,b,r,m){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av),o=cyl(g,r,r,v.length(),m,0,0,0);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
 function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>{if(!g.userData.holidayShared)g.dispose();});materials.forEach(m=>{if(m.userData.holidayShared)return;if(m.map?.userData.holidayOwned)m.map.dispose();m.dispose();});}
 function restorePaint(){for(const [m,c,e,map]of painted){m.color.copy(c);if(e)m.emissive.copy(e);if(m.map!==map){m.map=map;m.needsUpdate=true;}}painted=[];for(const [uniform,value]of paintedSky)uniform.value.copy(value);paintedSky=[];for(const [object,visible]of hiddenSky)object.visible=visible;hiddenSky=[];}
 function paint(roots){const seen=new Set(),t=info[api.id];if(!t)return;
  for(const root of roots)if(root)root.traverse(o=>{if(!o.isMesh||o.userData.holidaySkip)return;const uniforms=o.material?.uniforms;if(uniforms?.top?.value?.isColor){const skies=api.id==='halloween'?['#21142f','#56345f','#20182c']:api.id==='newyear'?['#071426','#172f4e','#10253b']:api.id==='birthday'?['#5f679f','#f0b88b','#a97c9a']:['#8fc6e5','#f3e9cf','#bdd9df'];['top','horizon','low'].forEach((key,i)=>{if(uniforms[key]){paintedSky.push([uniforms[key],uniforms[key].value.clone()]);uniforms[key].value.set(skies[i]);}});}for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m?.color||seen.has(m))continue;seen.add(m);painted.push([m,m.color.clone(),m.emissive?.clone(),m.map]);m.color.lerp(color(t.tint),api.id==='halloween'?.82:.38);if(o.geometry?.type==='PlaneGeometry'&&o.geometry.parameters.width>=900&&['newyear','halloween'].includes(api.id)){m.map=null;m.color.set(api.id==='newyear'?'#dfedf3':'#282239');m.needsUpdate=true;}}});
 }
 function label(parent,text,w=5,h=1){const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d'),t=info[api.id];ctx.fillStyle=api.id==='halloween'?'#301c49':'#183c51';ctx.beginPath();ctx.roundRect(0,0,1024,192,32);ctx.fill();ctx.strokeStyle=t.colors[0];ctx.lineWidth=12;ctx.stroke();ctx.fillStyle='#fff5dc';ctx.font='bold 78px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,100,965);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.userData.holidayOwned=true;return mesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}),0,0,0);}
 function balloon(parent,x,y,z,i=0){const m=material(info[api.id].colors[i%3]);const b=sphere(parent,.34,m,x,y,z);b.scale.y=1.25;rod(parent,[x,y-.38,z],[x-.1,y-1.7,z],.009,material('#f7ecdb'));}
 function gift(parent,x=0,z=0,scale=1,index=0){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);const t=info[api.id];const m=material(t.colors[index%3]),r=material('#fff0b8');box(g,.85,.72,.8,m,0,.36,0);box(g,.90,.10,.85,m,0,.77,0);box(g,.12,.84,.86,r,0,.42,0);box(g,.91,.84,.12,r,0,.42,0);const bow=new THREE.Mesh(new THREE.TorusGeometry(.16,.035,8,16),r);bow.position.set(.14,.93,0);bow.rotation.y=.3;g.add(bow);const bow2=bow.clone();bow2.position.x=-.14;bow2.rotation.y=-.3;g.add(bow2);g.scale.setScalar(scale);return g;}
 function pumpkin(g){const orange=material('#f78b20'),rib=material('#d45e16'),leaf=material('#57935e'),eye=material('#fff39a',true);
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const l=sphere(g,.47,i%2?orange:rib,Math.cos(a)*.32,.56,Math.sin(a)*.32);l.scale.set(.8,1.15,.8);}cyl(g,.08,.12,.35,leaf,0,1.16,0);
  for(const x of [-.27,.27]){const e=mesh(g,new THREE.ConeGeometry(.16,.24,3),eye,x,.68,-.68);e.rotation.z=x<0?-.2:.2;e.rotation.x=Math.PI/2;}
  box(g,.48,.12,.055,eye,0,.34,-.72);for(const x of [-.16,.12])box(g,.09,.11,.06,rib,x,.42,-.75);
 }
 function cake(g){const cream=material('#fff1d7'),pink=material('#f77daa'),gold=material('#f6bd63');cyl(g,.95,.95,.08,gold,0,.05,0);cyl(g,.76,.76,.7,pink,0,.43,0);cyl(g,.79,.79,.10,cream,0,.81,0);cyl(g,.48,.48,.4,cream,0,1.06,0);cyl(g,.50,.50,.09,pink,0,1.3,0);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;sphere(g,.08,pink,Math.cos(a)*.39,1.39,Math.sin(a)*.39);}for(const x of [-.21,0,.21]){cyl(g,.035,.035,.25,gold,x,1.48,0);const f=sphere(g,.06,material('#ffe58a',true),x,1.66,0);f.scale.y=1.6;}}
 function egg(g,index=0){const t=info[api.id],m=material(t.colors[index%3]);const e=sphere(g,.65,m,0,.76,0);e.scale.set(.88,1.22,.88);const band=mesh(g,new THREE.TorusGeometry(.57,.045,8,32),material('#fff5d4'),0,.72,0);band.rotation.x=Math.PI/2;for(let i=0;i<9;i++){const a=i/9*Math.PI*2;sphere(g,.06,material(t.colors[(index+1)%3]),Math.sin(a)*.53,.97,Math.cos(a)*.53);}for(const x of [-.35,.35]){const leaf=sphere(g,.2,material('#72bc8f'),x,.10,0);leaf.scale.set(1.5,.2,.7);}}
 function tree(g){const green=material('#31866b'),snow=material('#e8f7f6');cyl(g,.16,.22,.65,material('#93613d'),0,.33,0);for(let i=0;i<3;i++){const r=1.16-i*.28,y=1+i*.64;mesh(g,new THREE.ConeGeometry(r,1.5,18),green,0,y,0);mesh(g,new THREE.ConeGeometry(r*.85,.2,18),snow,0,y+.60,0);for(let k=0;k<7;k++){const a=k/7*Math.PI*2+i; sphere(g,.11,material(info[api.id].colors[k%3],true),Math.cos(a)*r*.70,y-.18,Math.sin(a)*r*.70);}}const star=mesh(g,new THREE.OctahedronGeometry(.24),material('#ffe59b',true),0,3.12,0);star.scale.y=1.5;gift(g,-.85,.25,.85,0);gift(g,.75,.2,.70,1);}
 function obstacle(index=0){const g=new THREE.Group();g.name='holiday-obstacle-'+api.id;g.userData.holiday=api.id;g.userData.r=.9;if(api.id==='halloween')pumpkin(g);else if(api.id==='birthday')cake(g);else if(api.id==='newyear'){gift(g,0,0,1.6,index);g.userData.r=1;}else egg(g,index);return g;}
 function bat(parent,x,y,z,scale=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);const m=material('#291737');sphere(g,.13,m,0,0,0);for(const sign of [-1,1]){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(sign*.65,.24);sh.lineTo(sign*.48,-.15);sh.lineTo(sign*.31,-.03);sh.lineTo(sign*.17,-.20);sh.lineTo(0,0);const wing=mesh(g,new THREE.ShapeGeometry(sh),m);wing.material.side=THREE.DoubleSide;}return g;}
 function web(parent,x,y,z,scale=1,rotation=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;g.scale.setScalar(scale);parent.add(g);const m=material('#c4b8dd');for(let i=0;i<7;i++){const a=i*Math.PI/3;rod(g,[0,0,0],[Math.cos(a)*1.2,Math.sin(a)*1.2,0],.009,m);}for(const r of [.35,.7,1.05])for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;rod(g,[Math.cos(a)*r,Math.sin(a)*r,0],[Math.cos(b)*r,Math.sin(b)*r,0],.009,m);}}
 function garland(parent,a,b,count=18){const m=material('#644d64');let prev=a;for(let k=1;k<=count;k++){const f=k/count,p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f-Math.sin(f*Math.PI)*.6,a[2]+(b[2]-a[2])*f];rod(parent,prev,p,.017,m);const lamp=sphere(parent,.09,material(info[api.id].colors[k%3],true),...p);if(api.id==='birthday'||api.id==='easter'){const flag=mesh(parent,new THREE.ConeGeometry(.18,.38,3),material(info[api.id].colors[k%3]),p[0],p[1]-.24,p[2]);flag.rotation.z=Math.PI;flag.rotation.y=Math.PI/2;}prev=p;}}
 function petals(parent,x,z){for(let k=0;k<3;k++){const xx=x+(k-1)*.30,zz=z+(k%2)*.16,m=material('#73b38a');rod(parent,[xx,0,zz],[xx,.62,zz],.025,m);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const p=sphere(parent,.11,material(info[api.id].colors[k%3]),xx+Math.sin(a)*.1,.65,zz+Math.cos(a)*.1);p.scale.y=1.7;}}}
 function particles(parent,w,d,height=4){const n=api.id==='halloween'?32:90,positions=new Float32Array(n*3),colors=new Float32Array(n*3);for(let k=0;k<n;k++){positions[k*3]=(Math.random()-.5)*w;positions[k*3+1]=Math.random()*height+.4;positions[k*3+2]=(Math.random()-.5)*d;color(api.id==='newyear'?'#ffffff':info[api.id].colors[k%3]).toArray(colors,k*3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const mat=new THREE.PointsMaterial({size:api.id==='newyear'?.055:.045,vertexColors:true,transparent:true,opacity:.85});const p=new THREE.Points(geo,mat);p.name='holiday-particles';p.userData.height=height;parent.add(p);}
 function dropDecor(){restorePaint();if(decorations){decorations.removeFromParent();dispose(decorations);decorations=null;}}
 function lighting(outdoor=false){if(!api.id)return;const t=info[api.id];scene.background=color(t.sky);if(scene.fog)scene.fog.color.copy(color(t.sky));const h=options.hemi,l=options.light;if(h){h.color.set(api.id==='halloween'?'#c8b1ec':'#dfefff');h.intensity=api.id==='halloween'?.75:1.05;}if(l){l.color.set(api.id==='halloween'?'#ffd09b':api.id==='newyear'?'#e8f4ff':'#ffe4bd');l.intensity=api.id==='halloween'?1.65:2.7;}if(outdoor){const night=['halloween','newyear'].includes(api.id);scene.background=color(api.id==='newyear'?'#0e223b':api.id==='halloween'?'#181124':api.id==='birthday'?'#dca996':'#bce0ef');if(scene.fog)scene.fog.color.copy(scene.background);if(h){h.intensity=night?.62:.95;h.groundColor.set(night?'#25344d':'#7f9885');}if(l){l.intensity=night?1.2:api.id==='birthday'?2.2:2.7;l.color.set(api.id==='newyear'?'#b5d5ff':api.id==='halloween'?'#cbb9ed':api.id==='birthday'?'#ffd0a0':'#fff0d0');}}}
 api.obstacle=obstacle;
 api.room=(root,opts)=>{lastRoom={root,opts};lastTrack=null;dropDecor();if(opts.colliders){for(let i=opts.colliders.length-1;i>=0;i--)if(opts.colliders[i].holiday)opts.colliders.splice(i,1);}if(!api.id)return;
  lighting();const {width:w,depth:d,floor,hall=false}=opts;paint([floor,...root.children.filter(g=>g.userData.battleRoomArt)]);
  const g=decorations=new THREE.Group();g.name='seasonal-room-'+api.id;root.add(g);
  garland(g,[-w/2+.35,3.8,-d/2+.4],[w/2-.35,3.8,-d/2+.4],Math.max(8,Math.round(w)));
  for(const s of [-1,1])garland(g,[s*(w/2-.4),3.65,-d/2+.5],[s*(w/2-.4),3.65,d/2-.5],Math.round(d));
  const sign=label(g,info[api.id].title,hall?4:7,hall?.72:1.1);sign.position.set(0,3,-d/2+.55);
  if(api.id==='halloween'){for(const s of [-1,1]){web(g,s*(w/2-1.2),3,-d/2+.6,hall?.5:1.0);for(let k=0;k<3;k++)bat(g,s*(w*.23),3+k*.25,-d*.35+k*1.5,.9);}}
  if(api.id==='birthday'){for(const s of [-1,1])for(let k=0;k<3;k++)balloon(g,s*(w/2-.7)-s*k*.22,2.6+(k%2)*.5,-d/2+1.1+k*.15,k);}
  const candidates=hall?[]:[[-5,-5],[5,-4],[-7,4],[7,4],[0,-6],[-4,5],[4,6],[-9,0],[9,0],[-3,-3],[3,3],[0,4]];
  let placed=0;for(const [x,z]of candidates){if(Math.abs(x)>w/2-2||Math.abs(z)>d/2-2)continue;if(opts.colliders?.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+1.8))continue;const p=obstacle(placed);p.position.set(x,0,z);g.add(p);opts.colliders?.push({x,z,r:p.userData.r,mesh:p,holiday:true});if(api.id==='birthday')balloon(g,x+.7,2.3,z,placed);if(api.id==='easter')petals(g,x+.9,z);if(++placed===4)break;}
  // У стен — украшения; дверные проёмы и стартовые места остаются свободными.
  for(const s of [-1,1]){const prop=api.id==='newyear'?new THREE.Group():obstacle(s>0?1:0);if(api.id==='newyear')tree(prop);prop.position.set(s*(w/2-.95),0,-d/2+2);if(hall)prop.scale.setScalar(.55);g.add(prop);}
  particles(g,w-1,d-1);
 };
 api.track=(root,opts)=>{lastTrack={root,opts};lastRoom=null;dropDecor();if(!api.id)return;lighting(true);paint([root]);const g=decorations=new THREE.Group();g.name='seasonal-track-'+api.id;g.userData.weather={halloween:'night',newyear:'night',easter:'day',birthday:'sunset'}[api.id];root.add(g);const {points,sideAt,elev,count,halfWidth=10}=opts;
  if(['halloween','newyear'].includes(api.id)){
   for(const name of ['royal-sun-glow','royal-sun-disc']){const sun=root.getObjectByName(name);if(sun){hiddenSky.push([sun,sun.visible]);sun.visible=false;}}
   const positions=new Float32Array(170*3);for(let i=0;i<170;i++){const a=i*2.399963,up=.22+(i%37)/50,r=230;positions[i*3]=Math.cos(a)*r*Math.sqrt(1-up*up);positions[i*3+1]=up*r+20;positions[i*3+2]=Math.sin(a)*r*Math.sqrt(1-up*up)-30;}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));const stars=new THREE.Points(geo,new THREE.PointsMaterial({color:'#e5efff',size:.8,sizeAttenuation:true,fog:false}));stars.name='holiday-night-stars';g.add(stars);
   const moon=mesh(g,new THREE.SphereGeometry(9,24,16),new THREE.MeshBasicMaterial({color:api.id==='halloween'?'#f0d7a9':'#deecff',fog:false}),140,128,-165);moon.name='holiday-moon';moon.castShadow=false;
   for(const [x,y,r]of [[-2,3,1.2],[3,-1,1.7],[-3,-3,.8]]){const crater=mesh(moon,new THREE.CircleGeometry(r,16),new THREE.MeshBasicMaterial({color:api.id==='halloween'?'#ccb68f':'#b8cedd',side:THREE.DoubleSide,fog:false}),x,y,-8.7);crater.rotation.y=Math.PI;}
  }
  for(let i=0;i<count;i+=Math.max(18,Math.floor(count/26))){const p=points[i],s=sideAt(i),h=elev(i/count);for(const sign of [-1,1]){const a=new THREE.Group();a.position.set(p.x+s.x*(halfWidth+2.4)*sign,h,p.z+s.z*(halfWidth+2.4)*sign);a.rotation.y=Math.atan2(s.x*sign,s.z*sign);g.add(a);if(api.id==='newyear')tree(a);else{const prop=obstacle(i%3);prop.scale.setScalar(1.65);a.add(prop);if(api.id==='birthday')for(let k=0;k<3;k++)balloon(a,(k-1)*.4,3+k*.2,0,k);if(api.id==='halloween'){web(a,0,3,0,1.5);bat(a,0,3.4,0,1.8);}if(api.id==='easter')petals(a,1.2,0);}}}
  for(const fraction of [.015,.26,.51,.76]){const i=Math.floor(count*fraction),p=points[i],s=sideAt(i),gate=new THREE.Group();gate.position.set(p.x,elev(i/count),p.z);gate.rotation.y=Math.atan2(s.x,s.z)-Math.PI/2;g.add(gate);for(const sign of [-1,1])cyl(gate,.12,.18,6.5,material(info[api.id].colors[1]),sign*(halfWidth+.8),3.25,0);garland(gate,[-halfWidth-.8,6.4,0],[halfWidth+.8,6.4,0],28);const text=label(gate,info[api.id].title,8,1.2);text.position.set(0,6,0);}
  const p=points[0],cloud=new THREE.Group();cloud.position.set(p.x,0,p.z);g.add(cloud);particles(cloud,70,70,12);
 };
 function monsterEye(parent,x,y,z,kind='zombie',size=.13){const white=material(kind==='wolf'?'#ffcf69':'#fff3ca');sphere(parent,size,white,x,y,z);sphere(parent,size*.43,material('#24202e'),x+(kind==='zombie'?.025:0),y,z-size*.75);}
 function stitches(parent,x,y,z,width=.48,angle=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.z=angle;parent.add(g);const dark=material('#403442');rod(g,[-width/2,0,0],[width/2,0,0],.012,dark);for(let i=0;i<5;i++){const xx=-width/2+(i+.5)*width/5;rod(g,[xx-.025,-.055,.005],[xx+.025,.055,.005],.014,dark);}}
 function zombieCostume(g){const skin=material('#90a887'),cloth=material('#cec7ac'),patch=material('#74728d');
  const face=box(g,.82,.56,.055,skin,0,.65,-.185);face.rotation.z=.06;
  monsterEye(g,-.24,.76,-.23,'zombie',.14);monsterEye(g,.23,.69,-.23,'zombie',.12);
  stitches(g,.05,.43,-.24,.52,-.12);stitches(g,-.53,.71,-.21,.30,.75);
  for(const [x,y,a]of [[-.76,.76,.45],[.70,.68,-.35]]){const band=box(g,.29,.72,.05,cloth,x,y,-.05);band.rotation.z=a;}
  const repair=box(g,.36,.27,.06,patch,.45,.47,-.17);repair.rotation.z=.25;stitches(g,.45,.47,-.215,.25,.25);
  const sh=new THREE.Shape();sh.moveTo(-.5,.12);sh.lineTo(.5,.12);sh.lineTo(.4,-.25);sh.lineTo(.21,-.14);sh.lineTo(.08,-.30);sh.lineTo(-.14,-.17);sh.lineTo(-.43,-.26);sh.closePath();const rag=mesh(g,new THREE.ShapeGeometry(sh),cloth,0,.70,.85);rag.material.side=THREE.DoubleSide;
  g.userData.costume='Зомби';
 }
 function frankensteinCostume(g){const green=material('#8abc85'),steel=material('#9cabb3'),dark=material('#323441'),energy=material('#82ffd0',true);
  box(g,.75,.55,.065,green,.18,.70,-.18);box(g,.80,.12,.08,dark,.18,1.01,-.18);stitches(g,.18,.91,-.24,.60,.05);
  monsterEye(g,-.03,.77,-.24,'frank',.105);monsterEye(g,.39,.77,-.24,'frank',.105);stitches(g,.18,.52,-.24,.38,0);
  for(const sign of [-1,1]){const bolt=cyl(g,.12,.12,.29,steel,sign*1.05,.67,.20,8);bolt.rotation.z=Math.PI/2;const cap=cyl(g,.17,.17,.09,steel,sign*1.19,.67,.20,6);cap.rotation.z=Math.PI/2;}
  const ring=mesh(g,new THREE.TorusGeometry(.375,.038,8,30),energy,-.48,1.30,.36);ring.rotation.x=Math.PI/2;
  const ring2=ring.clone();ring2.position.y=.98;g.add(ring2);
  const pts=[[-.56,1.38,.15],[-.44,1.25,.12],[-.57,1.18,.12],[-.39,1.05,.14]];for(let i=1;i<pts.length;i++)rod(g,pts[i-1],pts[i],.028,energy);
  sphere(g,.055,energy,-.48,1.40,.36);g.userData.costume='Франкенштейн';
 }
 function werewolfCostume(g){const fur=material('#716052'),lighter=material('#bba186'),nose=material('#29232d'),ear=material('#d58f97');
  for(const sign of [-1,1]){const sh=new THREE.Shape();sh.moveTo(-.22,0);sh.lineTo(0,.60);sh.lineTo(.23,0);sh.closePath();const e=mesh(g,new THREE.ShapeGeometry(sh),fur,sign*.58,.69,-.05);e.rotation.z=-sign*.22;e.material.side=THREE.DoubleSide;const inner=mesh(g,new THREE.ShapeGeometry(sh),ear,sign*.58,.73,-.075);inner.scale.set(.50,.62,.6);inner.rotation.z=-sign*.22;}
  for(const sign of [-1,1]){const cheek=sphere(g,.27,lighter,sign*.20,.42,-.93);cheek.scale.set(1,.8,.62);monsterEye(g,sign*.39,.64,-.84,'wolf',.12);const brow=box(g,.28,.075,.08,fur,sign*.39,.77,-.84);brow.rotation.z=-sign*.25;const paw=sphere(g,.26,fur,sign*.88,.18,-.25);paw.scale.set(.65,.55,1.1);for(let k=0;k<3;k++)sphere(g,.045,lighter,sign*.88+(k-1)*.08,.12,-.48);}
  const sn=sphere(g,.12,nose,0,.44,-1.12);sn.scale.set(1.1,.75,.7);
  const tail=new THREE.Group();tail.position.set(.48,.38,.90);tail.rotation.x=.18;g.add(tail);for(let i=0;i<5;i++){const tuft=sphere(tail,.20-i*.022,i>2?lighter:fur,Math.sin(i*.55)*.16,i*.14,i*.17);tuft.scale.set(1.0,1.05,1.35);}
  for(let i=0;i<5;i++){const tuft=sphere(g,.13,fur,-.6+i*.3,.7,.45);tuft.scale.set(.7,1.5,1.0);}g.userData.costume='Оборотень';
 }
 api.skin=(root,model)=>{root.userData.holidayModel=model;const old=root.getObjectByName('seasonal-vacuum-skin');if(old){old.removeFromParent();dispose(old);}if(!api.id)return;const g=new THREE.Group();g.name='seasonal-vacuum-skin';g.userData.holiday=api.id;root.add(g);
  const driver=root.userData.driver||root.children.find(c=>c.type==='Group'&&c.children.length>10),y=(driver?.position.y??.7)+.66;
  if(api.id==='halloween'){
   if(model==='canister'){zombieCostume(g);return;}if(model==='cyclone'){frankensteinCostume(g);return;}if(model==='robot'){werewolfCostume(g);return;}
   if(!['stick','steam','washer'].includes(model)){root.remove(g);return;}g.userData.costume='Дракула';
   const head={stick:{z:-1.04,y:.39,x:.47},steam:{z:-1.04,y:.30,x:.39},washer:{z:-1.02,y:.43,x:.41}}[model];
   // Curved, tapered ivory teeth point DOWN from the upper edge of the brush.
   for(const sign of [-1,1]){const positions=[],indices=[],rings=7,sides=14;
    for(let row=0;row<=rings;row++){const t=row/rings,r=.082*Math.pow(1-t,.75);for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2;positions.push(Math.cos(a)*r+sign*.018*t*t,-.31*t,Math.sin(a)*r-.045*t*t);}}
    for(let row=0;row<rings;row++)for(let k=0;k<sides;k++){const a=row*(sides+1)+k,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(positions),3));geo.setIndex(indices);geo.computeVertexNormals();
    const fang=mesh(g,geo,material('#fff7dd'),sign*head.x,head.y,head.z);fang.name='Вампирский клык вниз на щётке';fang.userData.pointsDown=true;
   }
   const height=model==='washer'?1.95:1.80,width=model==='washer'?.77:.67;
   const shape=new THREE.Shape();shape.moveTo(-.30,height);shape.quadraticCurveTo(-.65,height*.95,-.88,height*.71);shape.lineTo(-1.03,.22);
   shape.quadraticCurveTo(-.77,.39,-.61,.12);shape.quadraticCurveTo(-.39,.33,-.20,.08);shape.quadraticCurveTo(0,.30,.20,.08);shape.quadraticCurveTo(.39,.33,.61,.12);shape.quadraticCurveTo(.77,.39,1.03,.22);shape.lineTo(.88,height*.71);shape.quadraticCurveTo(.65,height*.95,.30,height);shape.closePath();
   const geo=new THREE.ShapeGeometry(shape,12),pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),yy=pos.getY(i);pos.setXYZ(i,x*width,yy,.42+Math.pow(1-yy/height,1.5)*.48+Math.sin(x*8)*.045);}geo.computeVertexNormals();
   const outside=new THREE.MeshStandardMaterial({color:'#251d35',roughness:.55,side:THREE.FrontSide}),inside=new THREE.MeshStandardMaterial({color:'#a52146',roughness:.5,side:THREE.BackSide});
   const cape=mesh(g,geo,outside);cape.name='Плащ Дракулы с фигурным краем';const lining=mesh(g,geo.clone(),inside);lining.name='Бордовая подкладка плаща Дракулы';lining.position.z=-.008;
   const collarMat=material('#a52146');collarMat.side=THREE.DoubleSide;
   for(const sign of [-1,1]){const collar=new THREE.Shape();collar.moveTo(0,0);collar.lineTo(sign*.57,.45);collar.quadraticCurveTo(sign*.66,.15,sign*.29,-.25);collar.closePath();const c=mesh(g,new THREE.ShapeGeometry(collar),collarMat,0,height-.02,.36);c.rotation.y=-sign*.20;c.name='Высокий воротник Дракулы';}
   const clasp=sphere(g,.085,material('#f3cb74'),0,height-.07,-.12);clasp.name='Золотая застёжка плаща';
  }else if(api.id==='birthday'){mesh(g,new THREE.ConeGeometry(.23,.65,18),material('#ff86bb'),0,y+.27,0);sphere(g,.10,material('#ffe7a3'),0,y+.63,0);}
  else if(api.id==='newyear'){mesh(g,new THREE.ConeGeometry(.25,.56,18),material('#d94158'),0,y+.20,0);const rim=mesh(g,new THREE.TorusGeometry(.24,.065,8,24),material('#fff8e6'),0,y-.06,0);rim.rotation.x=Math.PI/2;sphere(g,.11,material('#fff8e6'),.02,y+.51,0);}
  else{for(const sign of [-1,1]){const ear=sphere(g,.13,material('#fff3e1'),sign*.17,y+.26,0);ear.scale.set(.85,3.6,.75);ear.rotation.z=-sign*.2;const inner=sphere(g,.08,material('#f4abc7'),sign*.17,y+.29,-.08);inner.scale.set(.7,3.6,.4);inner.rotation.z=-sign*.2;}}
 };
 const pickupTemplates=new Map();
 function pickupTemplate(id,context){const key=id+'/'+context;if(pickupTemplates.has(key))return pickupTemplates.get(key);const g=new THREE.Group();const scale=context==='race'?3.0:1.0;
  if(id==='easter'){
   const cv=document.createElement('canvas');cv.width=128;cv.height=128;const c=cv.getContext('2d');c.fillStyle='#ffb2cc';c.fillRect(0,0,128,128);for(const [yy,co]of [[32,'#fff1ae'],[60,'#a8e8d0'],[88,'#fff1ae']]){c.fillStyle=co;c.fillRect(0,yy,128,9);}for(let x=4;x<128;x+=20){c.fillStyle='#fff7df';c.beginPath();c.arc(x,50,3,0,Math.PI*2);c.arc(x+8,105,3,0,Math.PI*2);c.fill();}
   const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.userData.battleKeep=true;const m=new THREE.MeshStandardMaterial({map:tex,roughness:.38});const e=sphere(g,.20,m,0,.08,0);e.scale.set(.8,1.15,.8);
  }else if(id==='newyear'){
   const green=material('#378560'),light=material('#8eb55c');for(let i=0;i<5;i++){const a=i*1.9+.2,len=.27+(i%2)*.1;const needle=box(g,.018,.018,len,i%2?green:light,Math.sin(a)*.08,-.065,Math.cos(a)*.06);needle.rotation.y=a;needle.rotation.z=.07*(i-2);}
  }else if(id==='halloween'){
   const pink=material('#ff8bd1'),orange=material('#ffc268');const body=box(g,.28,.025,.20,pink,0,-.025,0);body.rotation.y=.25;for(const sign of [-1,1]){const sh=new THREE.Shape();sh.moveTo(sign*.12,-.03);sh.lineTo(sign*.28,-.13);sh.lineTo(sign*.24,.13);sh.lineTo(sign*.12,.04);sh.closePath();const wing=mesh(g,new THREE.ShapeGeometry(sh),orange,0,-.02,0);wing.rotation.x=-Math.PI/2;wing.material.side=THREE.DoubleSide;}
   box(g,.05,.03,.21,material('#fff1aa'),0,-.025,0);
  }else{
   const cake=material('#d59852'),cream=material('#ffe5ab'),icing=material('#d87a9f');for(let i=0;i<4;i++){const crumb=box(g,.09+(i%2)*.035,.07+(i%3)*.02,.08,[cake,cream,cake,icing][i],(i%2-.5)*.19,-.035+(i%2)*.01,(Math.floor(i/2)-.5)*.17);crumb.rotation.y=i*.9;crumb.rotation.z=i*.1;}
  }
  g.scale.setScalar(scale);if(context==='race')g.position.y=id==='newyear'?-.62:id==='birthday'?-.5:0;
  g.traverse(o=>{if(o.geometry){o.geometry.userData.holidayShared=true;o.geometry.userData.battleKeep=true;}if(o.material){o.material.userData.holidayShared=true;o.material.userData.battleKeep=true;}});pickupTemplates.set(key,g);return g;
 }
 api.pickupSkin=root=>{const old=root.children.find(o=>o.name==='seasonal-pickup');if(old){root.remove(old);dispose(old);}const base=root.children.find(o=>o.name==='normal-pickup');if(base)base.visible=!api.id;root.userData.holidayPickupId=api.id;if(api.id){const visual=pickupTemplate(api.id,root.userData.holidayPickupContext).clone(true);visual.name='seasonal-pickup';visual.userData.pickupKind={easter:'Пасхальное яичко',newyear:'Иголки от ёлки',halloween:'Фантик от конфеты',birthday:'Крошки торта'}[api.id];root.add(visual);}};
 api.wrapPickup=(base,context)=>{const root=new THREE.Group();root.userData.holidayPickupContext=context;base.name='normal-pickup';root.add(base);api.pickupSkin(root);return root;};
 api.obstacleSkin=(root,radius=.9)=>{root.userData.holidayObstacleRadius=radius;const old=root.children.find(o=>o.name==='seasonal-obstacle-cover');if(old){root.remove(old);dispose(old);}if(!root.userData.holidayOriginalChildren)root.userData.holidayOriginalChildren=root.children.map(o=>[o,o.visible]);for(const [o,visible]of root.userData.holidayOriginalChildren)o.visible=api.id?false:visible;if(api.id){const cover=obstacle(0);cover.name='seasonal-obstacle-cover';cover.scale.setScalar(Math.min(1.8,radius/.9));root.add(cover);}};
 api.reskin=()=>{const models=[],obstacles=[],pickups=[];scene.traverse(o=>{if(o.userData.holidayModel)models.push(o);if(o.userData.holidayObstacleRadius)obstacles.push(o);if(o.userData.holidayPickupContext)pickups.push(o);});models.forEach(o=>api.skin(o,o.userData.holidayModel));obstacles.forEach(o=>api.obstacleSkin(o,o.userData.holidayObstacleRadius));pickups.forEach(o=>api.pickupSkin(o));};
 const tracks={
 birthday:{beat:.31,notes:[[67,1],[67,.5],[69,1.5],[67,1.5],[72,1.5],[71,3],[67,1],[67,.5],[69,1.5],[67,1.5],[74,1.5],[72,3],[67,1],[67,.5],[79,1.5],[76,1.5],[72,1.5],[71,1.5],[69,3],[77,1],[77,.5],[76,1.5],[72,1.5],[74,1.5],[72,4],[0,3]]},
 newyear:{beat:.3,notes:[[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],[77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[76,1],[74,1],[74,1],[76,1],[74,2],[79,2],[0,2]]},
 halloween:{beat:.34,notes:[[69,1],[72,1],[75,1],[76,2],[75,1],[72,1],[68,2],[69,1],[64,1],[65,1],[68,2],[64,1],[60,1],[57,3],[0,1]]},
 easter:{beat:.34,notes:[[72,1],[76,1],[79,2],[81,1],[79,1],[76,2],[77,1],[76,1],[74,1],[72,2],[74,1],[76,1],[79,3],[76,1],[74,1],[72,3],[0,2]]}
 };
 api.playMusic=(ctx,destination,quiet=false)=>{if(!api.id)return null;const selected=api.id,track=tracks[selected],bus=ctx.createGain();bus.gain.value=quiet?.55:.8;bus.connect(destination);let index=0,when=ctx.currentTime+.04,stopped=false;
  function note(midi,time,length,volume){if(!midi)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=selected==='halloween'?'triangle':'sine';osc.frequency.value=440*Math.pow(2,(midi-69)/12);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+length);osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+length+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  function schedule(){if(stopped)return;when=Math.max(when,ctx.currentTime+.015);while(when<ctx.currentTime+.35){const [midi,beats]=track.notes[index%track.notes.length],duration=beats*track.beat;note(midi,when,duration*.85,.12);if(index%3===0&&midi)note(midi-24,when,duration*.9,.055);when+=duration;index++;}}
  schedule();const timer=setInterval(schedule,100),player={id:selected,stop(){if(stopped)return;stopped=true;clearInterval(timer);bus.gain.setTargetAtTime(0,ctx.currentTime,.02);setTimeout(()=>bus.disconnect(),150);players.delete(player);}};players.set(player,true);return player;
 };
 function format(d){return d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'});}
 function range(d){const end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+6);return format(d)+' — '+format(end);}
 let modal,button,badge;function updateUI(){if(!button)return;const id=api.id;button.textContent=id?info[id].icon+' '+info[id].title:'🗓 Праздники';badge.textContent=id?info[id].icon+' '+info[id].title:'';badge.hidden=!id;document.body.dataset.holiday=id||'';}
 api.refresh=()=>{const old=api.id;active=activeAt(new Date(),birthday)?.id||null;if(old!==api.id){updateUI();api.onChange?.();}};
 api.redecorate=()=>{if(lastRoom)api.room(lastRoom.root,lastRoom.opts);else if(lastTrack)api.track(lastTrack.root,lastTrack.opts);api.reskin();};
 api.update=dt=>{elapsed+=dt;if(decorations){decorations.traverse(o=>{if(o.name==='holiday-particles'){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i)-dt*(api.id==='newyear'?.35:.10);if(y<.25)y=o.userData.height;a.setY(i,y);}a.needsUpdate=true;}});}};
 function open(){modal.replaceChildren();const panel=document.createElement('section');panel.className='mh-panel';panel.innerHTML='<h2>Праздники в игре</h2><p>Каждый праздник длится 7 дней, включая первый. Украшения и музыка включаются сами по дате устройства, в том числе без интернета.</p>';
  const status=document.createElement('p');status.textContent='Сейчас: '+(active?info[active].title:'обычное оформление')+'. Праздничный наряд доступен только в свою календарную неделю.';panel.append(status);
  for(const [id,t]of Object.entries(info)){const date=nextDate(id,new Date(),birthday),card=document.createElement('article');card.innerHTML='<h3>'+t.icon+' '+t.title+'</h3><p>'+range(date)+' '+date.getFullYear()+'</p><p>'+t.description+'</p>';if(id==='birthday'){const p=document.createElement('p');p.textContent='Первая сохранённая версия: '+new Date(birthday.year,birthday.month-1,birthday.day).toLocaleDateString('ru-RU')+'.';card.append(p);}panel.append(card);}
  const row=document.createElement('div');row.className='mh-actions';for(const [text,fn]of [['Закрыть',()=>{}]]){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{fn();modal.close();};row.append(b);}panel.append(row);modal.append(panel);modal.showModal();}
 function mount(){const style=document.createElement('style');style.textContent='.mh-button{border:1px solid #a9d6e777;border-radius:12px;background:#173c56;color:#fff6df;padding:11px 17px;font:700 16px system-ui;cursor:pointer;min-height:44px}.mh-button:focus-visible,.mh-panel button:focus-visible{outline:3px solid #ffd482;outline-offset:3px}#mh-dialog{width:min(680px,calc(100vw - 30px));max-height:90dvh;border:1px solid #90c8d9;border-radius:22px;background:#112a3e;color:#f3f8ff;padding:0;z-index:200000;box-sizing:border-box}#mh-dialog::backdrop{background:#031422bd}.mh-panel{padding:24px;font:16px/1.45 system-ui;touch-action:pan-y;text-align:left}.mh-panel h2{font-size:26px;margin:0 0 10px}.mh-panel h3{font-size:20px;margin:0}.mh-panel p{margin:8px 0;color:#d2e7ee}.mh-panel article{padding:16px;margin:12px 0;border:1px solid #608f9d;border-radius:15px;background:#1c3b51}.mh-panel button{font:700 16px system-ui;border:1px solid #d5b775;border-radius:10px;padding:10px 16px;min-height:44px;color:#152f43;background:#ffe2a1;cursor:pointer}.mh-actions{display:flex;gap:10px;flex-wrap:wrap}.mh-badge{position:fixed;bottom:max(8px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:22;pointer-events:none;background:#122738e6;border:1px solid #c6ad7e77;color:#fff0cb;border-radius:20px;padding:5px 12px;font:700 14px system-ui;white-space:nowrap}.mh-badge[hidden]{display:none}#menu>.mh-button{min-width:min(320px,80vw);flex-shrink:0}#menu{scrollbar-width:thin}';document.head.append(style);
  button=document.createElement('button');button.className='mh-button';button.id='mh-open';button.onclick=open;const parent=document.querySelector('#menu .menu-actions')||document.getElementById('menu');parent.append(button);modal=document.createElement('dialog');modal.id='mh-dialog';document.body.append(modal);modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});badge=document.createElement('div');badge.className='mh-badge';badge.id='mh-badge';document.body.append(badge);updateUI();}
 mount();setInterval(api.refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)api.refresh();});return api;
}
 global.MarkHolidays={create,orthodoxEaster,activeAt,dates,info};
})(window);
