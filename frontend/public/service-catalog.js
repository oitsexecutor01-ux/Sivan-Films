// Shared by the studio drawer and the accessible services page.
export function mountServiceCatalog(root,categories){
 const params=new URLSearchParams(location.search);
 const preview=params.get('preview')==='1';
 const catalogURL=new URL('/services.html',location.origin);
 if(preview)catalogURL.searchParams.set('preview','1');
 const headingTag=location.pathname.endsWith('/services.html')?'h1':'h2';
 const element=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
 function showCategories(focus=false){
  root.replaceChildren();
  const heading=element(headingTag,'Our services');heading.tabIndex=-1;
  root.append(heading,element('p','Explore our work by category.'));
  const grid=element('div',null,'room-grid service-category-grid');
  categories.forEach(category=>{
   const button=element('a',null,'room-tile service-category-tile');
   const url=new URL(catalogURL);url.searchParams.set('category',category.id);button.href=url.pathname+url.search;
   button.append(element('strong',category.name),element('span',category.images.length?category.images.length+(category.images.length===1?' image':' images'):'View gallery'));
   grid.append(button);
  });
  root.append(grid);
  if(!categories.length)root.append(element('p','Our service categories will be available soon.'));
  if(focus)heading.focus();
 }
 function showCategory(category){
  root.replaceChildren();
  const back=element('a','Back to categories','service-back');
  back.href=catalogURL.pathname+catalogURL.search;
  const heading=element(headingTag,category.name);heading.tabIndex=-1;
  const share=element('button','Copy category link','service-back');
  const status=element('p');status.setAttribute('role','status');
  share.onclick=async()=>{
   const url=new URL('/services.html',location.origin);url.searchParams.set('category',category.id);
   try{await navigator.clipboard.writeText(url.href);status.textContent='Category link copied.';}catch{status.textContent='Share this link: '+url.href;}
  };
  root.append(back,heading,share,status);
  document.title=category.name+' — Sivan Films';
  if(!category.images.length)root.append(element('p','Images for this category will be added soon.'));
  else {
   const grid=element('div',null,'service-image-grid');
   category.images.forEach((url,index)=>{
    const card=element('figure',null,'service-image-card');
    const link=element('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Open '+category.name+' image '+(index+1));
    const image=element('img');image.src=url;image.alt=category.name+' image '+(index+1);image.loading='lazy';
    image.onerror=()=>{link.replaceChildren(element('span','Image unavailable. Open image'));};
    link.append(image);card.append(link);grid.append(card);
   });
   root.append(grid);
  }
  heading.focus();
 }
 const selected=params.get('category');
 if(selected!==null){
  const category=categories.find(category=>category.id===selected);
  if(category)showCategory(category);
  else{
   const back=element('a','View all categories','service-back');back.href=catalogURL.pathname+catalogURL.search;
   root.replaceChildren(element(headingTag,'Category unavailable'),element('p','This category may have been removed. Explore our other categories.'),back);
   document.title='Category unavailable — Sivan Films';
  }
 }else showCategories();
}

