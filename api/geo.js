/* Vercel reads the visitor country from the edge. Local and other hosts
   get an empty country so the browser can try a free IP lookup instead. */
module.exports=(req,res)=>{
  const country=String(req.headers['x-vercel-ip-country']||'').toUpperCase();
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({country});
};
