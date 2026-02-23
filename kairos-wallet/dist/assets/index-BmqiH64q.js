var X=Object.defineProperty;var D=r=>{throw TypeError(r)};var Y=(r,e,t)=>e in r?X(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var A=(r,e,t)=>Y(r,typeof e!="symbol"?e+"":e,t),U=(r,e,t)=>e.has(r)||D("Cannot "+t);var f=(r,e,t)=>(U(r,e,"read from private field"),t?t.call(r):e.get(r)),l=(r,e,t)=>e.has(r)?D("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(r):e.set(r,t),d=(r,e,t,n)=>(U(r,e,"write to private field"),n?n.call(r,t):e.set(r,t),t);import{w as Z}from"./walletconnect-d3kaTToR.js";import"./ui-BnPoHVD1.js";const $="%[a-f0-9]{2}",j=new RegExp("("+$+")|([^%]+?)","gi"),k=new RegExp("("+$+")+","gi");function I(r,e){try{return[decodeURIComponent(r.join(""))]}catch{}if(r.length===1)return r;e=e||1;const t=r.slice(0,e),n=r.slice(e);return Array.prototype.concat.call([],I(t),I(n))}function v(r){try{return decodeURIComponent(r)}catch{let e=r.match(j)||[];for(let t=1;t<e.length;t++)r=I(e,t).join(""),e=r.match(j)||[];return r}}function rr(r){const e={"%FE%FF":"��","%FF%FE":"��"};let t=k.exec(r);for(;t;){try{e[t[0]]=decodeURIComponent(t[0])}catch{const a=v(t[0]);a!==t[0]&&(e[t[0]]=a)}t=k.exec(r)}e["%C2"]="�";const n=Object.keys(e);for(const a of n)r=r.replace(new RegExp(a,"g"),e[a]);return r}function er(r){if(typeof r!="string")throw new TypeError("Expected `encodedURI` to be of type `string`, got `"+typeof r+"`");try{return decodeURIComponent(r)}catch{return rr(r)}}function tr(r,e){const t={};if(Array.isArray(e))for(const n of e){const a=Object.getOwnPropertyDescriptor(r,n);a?.enumerable&&Object.defineProperty(t,n,a)}else for(const n of Reflect.ownKeys(r)){const a=Object.getOwnPropertyDescriptor(r,n);if(a.enumerable){const i=r[n];e(n,i,r)&&Object.defineProperty(t,n,a)}}return t}function M(r,e){if(!(typeof r=="string"&&typeof e=="string"))throw new TypeError("Expected the arguments to be of type `string`");if(r===""||e==="")return[];const t=r.indexOf(e);return t===-1?[]:[r.slice(0,t),r.slice(t+e.length)]}const nr=r=>r==null,ar=r=>encodeURIComponent(r).replaceAll(/[!'()*]/g,e=>`%${e.charCodeAt(0).toString(16).toUpperCase()}`),T=Symbol("encodeFragmentIdentifier");function ir(r){switch(r.arrayFormat){case"index":return e=>(t,n)=>{const a=t.length;return n===void 0||r.skipNull&&n===null||r.skipEmptyString&&n===""?t:n===null?[...t,[o(e,r),"[",a,"]"].join("")]:[...t,[o(e,r),"[",o(a,r),"]=",o(n,r)].join("")]};case"bracket":return e=>(t,n)=>n===void 0||r.skipNull&&n===null||r.skipEmptyString&&n===""?t:n===null?[...t,[o(e,r),"[]"].join("")]:[...t,[o(e,r),"[]=",o(n,r)].join("")];case"colon-list-separator":return e=>(t,n)=>n===void 0||r.skipNull&&n===null||r.skipEmptyString&&n===""?t:n===null?[...t,[o(e,r),":list="].join("")]:[...t,[o(e,r),":list=",o(n,r)].join("")];case"comma":case"separator":case"bracket-separator":{const e=r.arrayFormat==="bracket-separator"?"[]=":"=";return t=>(n,a)=>a===void 0||r.skipNull&&a===null||r.skipEmptyString&&a===""?n:(a=a===null?"":a,n.length===0?[[o(t,r),e,o(a,r)].join("")]:[[n,o(a,r)].join(r.arrayFormatSeparator)])}default:return e=>(t,n)=>n===void 0||r.skipNull&&n===null||r.skipEmptyString&&n===""?t:n===null?[...t,o(e,r)]:[...t,[o(e,r),"=",o(n,r)].join("")]}}function sr(r){let e;switch(r.arrayFormat){case"index":return(t,n,a)=>{if(e=/\[(\d*)]$/.exec(t),t=t.replace(/\[\d*]$/,""),!e){a[t]=n;return}a[t]===void 0&&(a[t]={}),a[t][e[1]]=n};case"bracket":return(t,n,a)=>{if(e=/(\[])$/.exec(t),t=t.replace(/\[]$/,""),!e){a[t]=n;return}if(a[t]===void 0){a[t]=[n];return}a[t]=[...a[t],n]};case"colon-list-separator":return(t,n,a)=>{if(e=/(:list)$/.exec(t),t=t.replace(/:list$/,""),!e){a[t]=n;return}if(a[t]===void 0){a[t]=[n];return}a[t]=[...a[t],n]};case"comma":case"separator":return(t,n,a)=>{const s=typeof n=="string"&&n.includes(r.arrayFormatSeparator)?n.split(r.arrayFormatSeparator).map(c=>g(c,r)):n===null?n:g(n,r);a[t]=s};case"bracket-separator":return(t,n,a)=>{const i=/(\[])$/.test(t);if(t=t.replace(/\[]$/,""),!i){a[t]=n&&g(n,r);return}const s=n===null?[]:g(n,r).split(r.arrayFormatSeparator);if(a[t]===void 0){a[t]=s;return}a[t]=[...a[t],...s]};default:return(t,n,a)=>{if(a[t]===void 0){a[t]=n;return}a[t]=[...[a[t]].flat(),n]}}}function W(r){if(typeof r!="string"||r.length!==1)throw new TypeError("arrayFormatSeparator must be single character string")}function o(r,e){return e.encode?e.strict?ar(r):encodeURIComponent(r):r}function g(r,e){return e.decode?er(r):r}function B(r){return Array.isArray(r)?r.sort():typeof r=="object"?B(Object.keys(r)).sort((e,t)=>Number(e)-Number(t)).map(e=>r[e]):r}function q(r){const e=r.indexOf("#");return e!==-1&&(r=r.slice(0,e)),r}function cr(r){let e="";const t=r.indexOf("#");return t!==-1&&(e=r.slice(t)),e}function K(r,e,t){return t==="string"&&typeof r=="string"?r:typeof t=="function"&&typeof r=="string"?t(r):t==="boolean"&&r===null?!0:t==="boolean"&&r!==null&&(r.toLowerCase()==="true"||r.toLowerCase()==="false")?r.toLowerCase()==="true":t==="boolean"&&r!==null&&(r.toLowerCase()==="1"||r.toLowerCase()==="0")?r.toLowerCase()==="1":t==="string[]"&&e.arrayFormat!=="none"&&typeof r=="string"?[r]:t==="number[]"&&e.arrayFormat!=="none"&&!Number.isNaN(Number(r))&&typeof r=="string"&&r.trim()!==""?[Number(r)]:t==="number"&&!Number.isNaN(Number(r))&&typeof r=="string"&&r.trim()!==""?Number(r):e.parseBooleans&&r!==null&&(r.toLowerCase()==="true"||r.toLowerCase()==="false")?r.toLowerCase()==="true":e.parseNumbers&&!Number.isNaN(Number(r))&&typeof r=="string"&&r.trim()!==""?Number(r):r}function x(r){r=q(r);const e=r.indexOf("?");return e===-1?"":r.slice(e+1)}function L(r,e){e={decode:!0,sort:!0,arrayFormat:"none",arrayFormatSeparator:",",parseNumbers:!1,parseBooleans:!1,types:Object.create(null),...e},W(e.arrayFormatSeparator);const t=sr(e),n=Object.create(null);if(typeof r!="string"||(r=r.trim().replace(/^[?#&]/,""),!r))return n;for(const a of r.split("&")){if(a==="")continue;const i=e.decode?a.replaceAll("+"," "):a;let[s,c]=M(i,"=");s===void 0&&(s=i),c=c===void 0?null:["comma","separator","bracket-separator"].includes(e.arrayFormat)?c:g(c,e),t(g(s,e),c,n)}for(const[a,i]of Object.entries(n))if(typeof i=="object"&&i!==null&&e.types[a]!=="string")for(const[s,c]of Object.entries(i)){const h=e.types[a],S=typeof h=="function"?h:h?h.replace("[]",""):void 0;i[s]=K(c,e,S)}else typeof i=="object"&&i!==null&&e.types[a]==="string"?n[a]=Object.values(i).join(e.arrayFormatSeparator):n[a]=K(i,e,e.types[a]);return e.sort===!1?n:(e.sort===!0?Object.keys(n).sort():Object.keys(n).sort(e.sort)).reduce((a,i)=>{const s=n[i];return a[i]=s&&typeof s=="object"&&!Array.isArray(s)?B(s):s,a},Object.create(null))}function G(r,e){if(!r)return"";e={encode:!0,strict:!0,arrayFormat:"none",arrayFormatSeparator:",",...e},W(e.arrayFormatSeparator);const t=s=>e.skipNull&&nr(r[s])||e.skipEmptyString&&r[s]==="",n=ir(e),a={};for(const[s,c]of Object.entries(r))t(s)||(a[s]=c);const i=Object.keys(a);return e.sort!==!1&&i.sort(e.sort),i.map(s=>{let c=r[s];if(e.replacer&&(c=e.replacer(s,c),c===void 0)||c===void 0)return"";if(c===null)return o(s,e);if(Array.isArray(c)){if(c.length===0&&e.arrayFormat==="bracket-separator")return o(s,e)+"[]";let h=c;return e.replacer&&(h=c.map((S,J)=>e.replacer(`${s}[${J}]`,S)).filter(S=>S!==void 0)),h.reduce(n(s),[]).join("&")}return o(s,e)+"="+o(c,e)}).filter(s=>s.length>0).join("&")}function V(r,e){e={decode:!0,...e};let[t,n]=M(r,"#");return t===void 0&&(t=r),{url:t?.split("?")?.[0]??"",query:L(x(r),e),...e&&e.parseFragmentIdentifier&&n?{fragmentIdentifier:g(n,e)}:{}}}function z(r,e){e={encode:!0,strict:!0,[T]:!0,...e};const t=q(r.url).split("?")[0]||"",n=x(r.url),a={...L(n,{sort:!1,...e}),...r.query};let i=G(a,e);i&&(i=`?${i}`);let s=cr(r.url);if(typeof r.fragmentIdentifier=="string"){const c=new URL(t);c.hash=r.fragmentIdentifier,s=e[T]?c.hash:`#${r.fragmentIdentifier}`}return`${t}${i}${s}`}function H(r,e,t){t={parseFragmentIdentifier:!0,[T]:!1,...t};const{url:n,query:a,fragmentIdentifier:i}=V(r,t);return z({url:n,query:tr(a,e),fragmentIdentifier:i},t)}function or(r,e,t){const n=Array.isArray(e)?a=>!e.includes(a):(a,i)=>!e(a,i);return H(r,n,t)}const fr=Object.freeze(Object.defineProperty({__proto__:null,exclude:or,extract:x,parse:L,parseUrl:V,pick:H,stringify:G,stringifyUrl:z},Symbol.toStringTag,{value:"Module"}));var O=(r=>(r.TRANSAK_WIDGET_INITIALISED="TRANSAK_WIDGET_INITIALISED",r.TRANSAK_ORDER_CREATED="TRANSAK_ORDER_CREATED",r.TRANSAK_ORDER_SUCCESSFUL="TRANSAK_ORDER_SUCCESSFUL",r.TRANSAK_ORDER_CANCELLED="TRANSAK_ORDER_CANCELLED",r.TRANSAK_ORDER_FAILED="TRANSAK_ORDER_FAILED",r.TRANSAK_WALLET_REDIRECTION="TRANSAK_WALLET_REDIRECTION",r.TRANSAK_WIDGET_CLOSE_REQUEST="TRANSAK_WIDGET_CLOSE_REQUEST",r.TRANSAK_WIDGET_CLOSE="TRANSAK_WIDGET_CLOSE",r))(O||{}),dr={name:"@transak/transak-sdk",version:"4.0.2"},_=r=>{if(!r)return!1;try{return!!new URL(r)}catch{return!1}},lr=r=>{if(!_(r))throw new Error("Invalid URL");return r};function P(r){let{name:e,version:t}=dr,{referrer:n,widgetUrl:a}=r||{};if(!_(n)||!_(a))throw new Error("referrer and widgetUrl are required and must be valid URLs");let i=fr.stringifyUrl({url:a,query:{sdkName:e,sdkVersion:t}},{arrayFormat:"comma"});return lr(i)}function Q(r){let e=document.createElement("iframe");return Object.assign(e,{id:"transakIframe",allow:"camera;microphone;payment",src:r}),e}function ur(){return`
    #transakIframe{
      width: 100%;
      height: 100%;
      border: none;
    }
  `}function mr(){let r=document.createElement("style");return r.innerHTML=ur(),document.getElementsByTagName("head")[0]?.appendChild(r),r}function hr(r){let e=mr(),t=Q(P(r));if(r.containerId){let n=document.getElementById(r.containerId);if(n)n.appendChild(t);else throw new Error("[Transak SDK] => Please enter a valid containerId")}return{styleElement:e,iframeElement:t}}var gr=`
  <svg id="transakCloseIcon" viewBox="0 0 612 612" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M306,0C136.992,0,0,136.992,0,306s136.992,306,306,306c168.988,0,306-137.012,306-306S475.008,0,306,0z M414.19,387.147
    c7.478,7.478,7.478,19.584,0,27.043c-7.479,7.478-19.584,7.478-27.043,0l-81.032-81.033l-81.588,81.588
    c-7.535,7.516-19.737,7.516-27.253,0c-7.535-7.535-7.535-19.737,0-27.254l81.587-81.587l-81.033-81.033
    c-7.478-7.478-7.478-19.584,0-27.042c7.478-7.478,19.584-7.478,27.042,0l81.033,81.033l82.181-82.18
    c7.535-7.535,19.736-7.535,27.253,0c7.535,7.535,7.535,19.737,0,27.253l-82.181,82.181L414.19,387.147z" />
  </svg>
`;function Er(r,e,t){return`
    #transakRoot {
      z-index: 9997;
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background: rgba(0, 0, 0, 0.6);
    }

    #transakModal {
      z-index: 9998;
      position: fixed;
      width: ${e};
      height: calc(${t} - 24px);
      top: 50%;
      left: 50%;
      transform: translate(-50%, calc(-50% - 12px));
      margin-top: 24px;
    }

    #transakCloseIcon {
      z-index: 9999;
      position: absolute;
      width: 36px;
      height: 36px;
      top: -24px;
      right: 0;
      transition: 0.5s;
      color: #${r};
      background: white;
      border-radius: 50%;
    }

    #transakCloseIcon:hover,
    #transakCloseIcon:focus {
      color: white;
      background: #${r};
      cursor: pointer;
    }

    #transakIframe{
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 10px;
      background: white;
    }

    @media screen and (max-width: 600px) {
      #transakModal {
        width: 100%;
        height: calc(100% - 24px);
      }

      #transakIframe{
        border-radius: 10px 10px 0 0;
      }
    }
  `}function yr(r){let{themeColor:e="1461db",widgetWidth:t="480px",widgetHeight:n="650px"}=r,a=document.createElement("style");return a.innerHTML=Er(e,t,n),document.getElementsByTagName("head")[0]?.appendChild(a),a}function Ar(r,e){let t=yr(r),n=document.createElement("div"),a=document.createElement("div"),i=Q(P(r));return Object.assign(a,{id:"transakModal",innerHTML:gr}),a.appendChild(i),Object.assign(n,{id:"transakRoot",onclick:()=>e()}),n.appendChild(a),document.getElementsByTagName("body")[0].appendChild(n),document.getElementById("transakCloseIcon")?.addEventListener("click",()=>e()),{styleElement:t,rootElement:n,iframeElement:i}}var N=new Z.EventEmitter,E,y,w,u,m,F,R,C,p,b,br=(F=class{constructor(r){l(this,E);l(this,y);l(this,w);l(this,u);l(this,m,!1);A(this,"init",()=>{f(this,m)||(f(this,R).call(this),d(this,m,!0))});A(this,"cleanup",()=>{f(this,y)?.remove(),f(this,p).call(this),f(this,u)?.remove(),d(this,m,!1)});A(this,"close",()=>{f(this,y)?.remove(),f(this,w)?.remove(),f(this,p).call(this),d(this,u,void 0),d(this,m,!1)});l(this,R,()=>{if(window.addEventListener("message",f(this,b)),f(this,E).containerId){let{styleElement:r,iframeElement:e}=hr(f(this,E));d(this,y,r),d(this,u,e)}else{let{styleElement:r,rootElement:e,iframeElement:t}=Ar(f(this,E),f(this,C));d(this,y,r),d(this,w,e),d(this,u,t)}});l(this,C,()=>{f(this,u)?.contentWindow?.postMessage({event_id:"TRANSAK_WIDGET_CLOSE_REQUEST"},"*")});l(this,p,()=>{N.removeAllListeners(),window.removeEventListener("message",f(this,b))});l(this,b,r=>{r?.data?.event_id&&f(this,m)&&N.emit(r.data.event_id,r.data.data)});if(!r?.widgetUrl)throw new Error("[Transak SDK] => widgetUrl is required");d(this,E,r)}},E=new WeakMap,y=new WeakMap,w=new WeakMap,u=new WeakMap,m=new WeakMap,R=new WeakMap,C=new WeakMap,p=new WeakMap,b=new WeakMap,A(F,"EVENTS",O),A(F,"on",(r,e)=>{O[r]&&N.on(r,e)}),F);export{br as Transak};
