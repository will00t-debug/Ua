export class FakeNode{
 constructor(tag='',text=''){this.tag=tag;this.textContent=text;this.children=[];this.attributes={};this.handlers={};this.className='';this.dataset={};}
 append(...nodes){
  for(const node of nodes){
   if(node instanceof FakeNode){
    if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(child=>child!==node);
    node.parentNode=this;
   }
   this.children.push(node);
  }
 }
 prepend(...nodes){const old=[...this.children];this.children=[];this.append(...nodes,...old);}
 focus(){}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(name,value){this.attributes[name]=value;}
 getAttribute(name){return this.attributes[name]??null;}
 addEventListener(name,callback){this.handlers[name]=callback;}
 get childElementCount(){return this.children.filter(n=>n instanceof FakeNode&&n.tag!=='#text').length;}
 get classList(){
  const node=this;
  return {
   add(...names){node.className=[...new Set([...node.className.split(/\s+/).filter(Boolean),...names])].join(' ');},
   toggle(name,force){const present=node.className.split(/\s+/).includes(name),active=force??!present;
    node.className=node.className.split(/\s+/).filter(n=>n&&n!==name).concat(active?[name]:[]).join(' ');return active;}
  };
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){
  const result=[];
  const matches=n=>selector.startsWith('.')?n.className.split(/\s+/).includes(selector.slice(1)):
   selector.startsWith('[')?Object.hasOwn(n.attributes,selector.slice(1,-1)):n.tag===selector;
  const visit=n=>{for(const child of n.children)if(child instanceof FakeNode){if(matches(child))result.push(child);visit(child);}};
  visit(this);return result;
 }
}
export function texts(node){
 if(!(node instanceof FakeNode))return String(node??'');
 return node.textContent+' '+node.children.map(texts).join(' ');
}

