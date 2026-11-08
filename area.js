/* area.js: the out-of-area notice is disabled.
   index.html still loads this file. It does not insert a banner, email form,
   or area styles, while shops are loading or after a postcode is known. */
(()=>{
  document.querySelectorAll('#areant,.area-nt').forEach(n=>n.remove());
})();
