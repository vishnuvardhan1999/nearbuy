/* p26: legal pages (Terms, Privacy, Seller Terms, Cookies) at /terms /privacy /seller-terms /cookies.
   DRAFT text, pending legal review. No company number / address / phone invented: placeholders are marked [ ... ]. */
(()=>{
const CFG=window.APP_CONFIG||{};
const PH=t=>`<span class="ph">[${t}]</span>`;
const MAIL=()=>CFG.CONTACT_EMAIL?`<a href="mailto:${esc(CFG.CONTACT_EMAIL)}">${esc(CFG.CONTACT_EMAIL)}</a>`:PH('contact email to be added');
const CONTACT=()=>`through the <a href="/contact">Contact page</a> on www.shopnip.co.uk (email: ${MAIL()})`;
const OP='ShopNip is a product of NuvonHub Private Limited (India)';
const UPD='Last updated 25 October 2026';
const LINKS=k=>`<nav class="lglinks" aria-label="Legal pages">${[['terms','Terms of Use'],['privacy','Privacy Policy'],['seller-terms','Seller Terms'],['cookies','Cookie Notice']].map(([h,l])=>`<a href="/${h}"${h===k?' aria-current="page"':''}>${l}</a>`).join('')}</nav>`;
const page=(k,title,intro,body)=>`<article class="info legal"><div class="ih"><div class="tag">Legal</div><h1>${title}</h1><p>${intro}</p></div>
 <div class="draft" role="note"><b>Draft, pending legal review.</b> This page has not yet been checked by a lawyer and may change.</div>
 <p class="lupd">${UPD}</p>${LINKS(k)}${body}
 <p class="lop">${OP}. Company details: ${PH('registered company number and address to be added')}.</p></article>${foot()}`;

V.terms=()=>page('terms','Terms of Use','The rules for using ShopNip as a shopper.',`
<h2>1. Who we are</h2><p>${OP} ("ShopNip", "we", "us"). You can reach us ${CONTACT()}.</p>
<h2>2. What ShopNip does</h2><p>ShopNip is a website where you can find products at independent local shops and place orders with them for click &amp; collect or local delivery. <b>When you place an order, your contract of sale is with the shop</b>, not with ShopNip. The shop is responsible for its products, prices, stock, collection, delivery, refunds and returns.</p>
<h2>3. Your account</h2><ul><li>You must be 18 or over to create an account.</li><li>Give accurate details, and keep your password private. You are responsible for activity on your account.</li><li>You can close your account at any time by contacting us.</li><li>We may suspend or close accounts that break these terms, place fake orders or misuse the service.</li></ul>
<h2>4. Prices, orders and payment</h2><ul><li>Prices are set by each shop and shown in pounds sterling. The price you see when you place the order is the price you pay, plus any delivery fee shown at checkout.</li><li>An order is a request to the shop. It is confirmed when the shop accepts it. A shop can decline an order, for example if an item is out of stock.</li><li><b>For now, you pay the shop directly</b>, on collection or on delivery. ShopNip does not take card payments.</li></ul>
<h2>5. Click &amp; collect</h2><p>When your order is ready, we show you a collection PIN. Give it to the shop when you collect. Keep it private: anyone with your PIN may be able to collect your order.</p>
<h2>6. Cancelling and returns</h2><p>You can cancel an order on ShopNip until the shop accepts it. After that, contact the shop. Returns and refunds are handled by the shop. Your legal rights, including under the Consumer Rights Act 2015, are not affected.</p>
<h2>7. Using the site fairly</h2><p>Don't misuse ShopNip: no fake orders, no attempts to break or overload the site, no scraping, and no use that is unlawful or harms others.</p>
<h2>8. Our responsibility</h2><p>We work to keep ShopNip accurate and available, but we can't promise it will always be error-free or online. Product details come from shops and our catalogue and may contain mistakes. We are not responsible for a shop's products or for what happens between you and a shop, except where the law says we are. Nothing in these terms limits liability that cannot be limited by law, such as for death or personal injury caused by negligence, or fraud.</p>
<h2>9. Changes</h2><p>We may update these terms. If a change is important we will tell you on the site. The date at the top shows the latest version.</p>
<h2>10. Law</h2><p>These terms are governed by the law of England and Wales. If you live elsewhere in the UK, you can also bring a claim in your local courts.</p>`);

V.privacy=()=>page('privacy','Privacy Policy','What personal data ShopNip collects, why, and your rights under UK data protection law (UK GDPR and the Data Protection Act 2018).',`
<h2>1. Who is responsible</h2><p>${OP} is the controller of the personal data described here. Contact us about privacy ${CONTACT()}. ${PH('UK representative details, if required, to be added')}</p>
<h2>2. What we collect</h2><ul>
<li><b>Account details</b>: your email address, name and password (the password is stored securely by our provider; we can't see it).</li>
<li><b>Contact details</b>: your phone number, so the shop can reach you about an order.</li>
<li><b>Address and postcode</b>: your postcode to show shops near you, and your delivery address if you choose delivery.</li>
<li><b>Location, only if you choose it</b>: if you tap "Use my location", your browser asks permission and sends your position once. We turn it into a postcode. We don't track your location in the background.</li>
<li><b>Orders</b>: what you ordered, from which shop, collection or delivery, notes you add, order status and history.</li>
<li><b>Shop owners</b>: shop name, address, phone, opening hours, listings and the trade account email used to match wholesale orders.</li>
<li><b>Technical data</b>: basic logs kept by our hosting providers (such as IP address and browser type) for security.</li></ul>
<h2>3. Why we use it</h2><table class="ltbl"><thead><tr><th>Purpose</th><th>Lawful basis</th></tr></thead><tbody>
<tr><td>Creating and running your account</td><td>Contract</td></tr>
<tr><td>Passing your order to the shop you chose, and showing you its status</td><td>Contract</td></tr>
<tr><td>Showing nearby shops and checking delivery areas</td><td>Contract, or your consent when you use your device location</td></tr>
<tr><td>Keeping ShopNip secure and preventing misuse</td><td>Legitimate interests</td></tr>
<tr><td>Keeping records we are legally required to keep</td><td>Legal obligation</td></tr>
<tr><td>Sending deal emails, only if you sign up for them</td><td>Consent (you can unsubscribe at any time)</td></tr></tbody></table>
<p>We don't sell your data and we don't use it for advertising.</p>
<h2>4. Who we share it with</h2><ul>
<li><b>The shop you order from</b> gets your name, phone, order details and, for delivery, your address.</li>
<li><b>Supabase</b> is our processor. It provides our database, login and file storage, and processes data only on our instructions.</li>
<li><b>Vercel</b> hosts the website.</li>
<li><b>postcodes.io</b> turns postcodes and locations into map positions. We send it only a postcode or coordinates, not your name.</li></ul>
<p>Some of these providers may process data outside the UK. Where they do, we rely on appropriate safeguards such as the UK International Data Transfer Addendum or adequacy regulations. ${PH('confirm provider regions and transfer safeguards')}</p>
<h2>5. How long we keep it</h2><ul><li>Account details: while your account is open, then deleted within ${PH('period to be confirmed, e.g. 30 days')} of closing it.</li><li>Order records: up to 6 years, for accounting and dispute purposes.</li><li>Security logs: kept by our providers for a short period, usually no more than ${PH('period to be confirmed')}.</li><li>Data on your device: until you clear it (see section 7).</li></ul>
<h2>6. Your rights</h2><p>You have the right to access your data, have it corrected or deleted, restrict or object to how we use it, take a copy to another service (portability), and withdraw consent at any time. To use any of these rights, contact us ${CONTACT()}. We will reply within one month. If you're unhappy, you can complain to the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" rel="noopener" target="_blank">ico.org.uk</a>.</p>
<h2>7. Cookies and storage on your device</h2><p>ShopNip doesn't use advertising or analytics cookies. We use your browser's local storage, which works like a cookie, only for things the site needs to work. The full list is in our <a href="/cookies">Cookie Notice</a>.</p>
<h2>8. Children</h2><p>ShopNip is not meant for children under 18, and we don't knowingly collect their data.</p>
<h2>9. Changes</h2><p>We will update this page if we change how we use data. The date at the top shows the latest version.</p>`);

V['seller-terms']=()=>page('seller-terms','Seller Terms','The rules for shops that sell on ShopNip. They apply alongside our Terms of Use and Privacy Policy.',`
<h2>1. Who we are</h2><p>${OP} ("ShopNip", "we"). Contact us ${CONTACT()}.</p>
<h2>2. Joining and approval</h2><ul><li>You must be a genuine business with a physical shop, and the person signing up must be allowed to act for it.</li><li><b>We review every shop</b> before it goes live, and we may approve or decline it at our discretion.</li><li>Keep your shop details accurate: name, address, phone, opening hours, delivery area and trade account email.</li></ul>
<h2>3. Listings</h2><ul><li><b>Your listings must be accurate</b>: the right product, price, stock and photos. Update them when things change.</li><li>You set your own prices. A "was" price must be a price you genuinely charged.</li><li>Only list products you can lawfully sell. No illegal, unsafe, counterfeit or age-restricted items unless we have agreed it with you in writing.</li><li>Catalogue photos and descriptions are provided to help you. Check them, and tell us about any errors.</li></ul>
<h2>4. Orders and fulfilment</h2><ul><li>Accept or decline new orders promptly. Once you accept an order, you must fulfil it at the price shown.</li><li>Have click &amp; collect orders ready by the time shown to the customer, and keep order status up to date (accepted, ready, completed).</li><li>If you offer delivery, deliver only within the area and for the fee you set, in a reasonable time.</li><li>You are the seller. You are responsible for the goods, for refunds and returns, and for your obligations to customers under consumer law.</li></ul>
<h2>5. Click &amp; collect PIN checks</h2><p>Each order has a collection PIN. <b>Before handing over an order, ask for the PIN and check it matches</b> the one shown in your order inbox. If the PIN doesn't match, don't hand the order over. ShopNip is not responsible for orders handed over without a matching PIN.</p>
<h2>6. Payment</h2><p>For now, <b>customers pay you directly, at the shop or on delivery</b>. ShopNip does not take payments or hold money for you. You are responsible for taking payment, giving receipts and handling refunds.</p>
<h2>7. Fees</h2><p><b>ShopNip is free for shops during the pilot.</b> We may introduce fees later. If we do, we will give you at least ${PH('notice period to be confirmed, e.g. 30 days')} written notice before they start. You can leave before any new fees apply.</p>
<h2>8. Customer data</h2><p>You receive customer details (name, phone, and address for delivery) only to fulfil their order. Use them only for that order, keep them secure, and don't use them for marketing unless the customer has agreed separately. You are responsible for your own compliance with UK data protection law.</p>
<h2>9. Suspension and removal</h2><p>We may hide listings, or suspend or remove a shop, if it breaks these terms, receives repeated complaints, gives inaccurate information, or puts customers at risk. Where we reasonably can, we will tell you why and give you a chance to fix things first. You can close your shop at any time by contacting us.</p>
<h2>10. Our responsibility</h2><p>ShopNip is provided during a pilot and may change. We aren't liable for lost sales or profits caused by the site being unavailable. Nothing in these terms limits liability that can't be limited by law.</p>
<h2>11. Changes and law</h2><p>We may update these terms and will tell you about important changes. The law of England and Wales applies.</p>`);

V.cookies=()=>{const rows=[
 ['nb_basket','Your basket','Until you check out or clear it'],
 ['nb_pc, nb_me','Your postcode and the map position used to show nearby shops','Until you change or clear it'],
 ['nb_recent','Recently viewed and searched items, shown back to you','Until you clear it'],
 ['nb_contact','Your name and phone, to pre-fill checkout','Until you clear it'],
 ['nb_notify','Items you asked to be told about when back in stock','Until you clear it'],
 ['nb_subs, nb_r','Remembers that you signed up for deals, and small display settings','Until you clear it'],
 ['sb-…-auth-token','Keeps you logged in (set by Supabase, our login provider)','Until you log out'],
 ['Session storage (nb_nt and similar)','One-off messages, so they aren\u2019t shown twice','Until you close the tab'],
 ['Service worker cache','Saves the site\u2019s files so it loads fast and works offline','Until the site updates or you clear it']];
 return page('cookies','Cookie Notice','How ShopNip uses cookies and similar storage on your device.',`
<h2>The short version</h2><p><b>ShopNip doesn't use advertising, tracking or analytics cookies.</b> We only store what the site needs to work, mostly in your browser's local storage. Because this storage is strictly necessary for features you ask for, we don't need to ask for consent, but we want you to know what it is.</p>
<h2>What we store</h2><table class="ltbl"><thead><tr><th>Name</th><th>What it's for</th><th>How long</th></tr></thead><tbody>${rows.map(r=>`<tr><td><code>${r[0]}</code></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
<h2>Other sites</h2><p>Our fonts come from Google Fonts, so your browser connects to Google to fetch them. Google may receive your IP address, but no cookies are set by ShopNip for this. Postcode lookups go to postcodes.io.</p>
<h2>Your choices</h2><p>You can clear this data at any time in your browser settings (for example "Clear site data"). If you do, your basket and postcode will be forgotten and you will be logged out. If we ever add optional cookies, we will ask for your consent first.</p>
<h2>More</h2><p>See our <a href="/privacy">Privacy Policy</a>, or contact us ${CONTACT()}.</p>`)};

const css=`.legal{max-width:820px}.legal h2{font-size:19px;margin:26px 0 8px}.legal p,.legal li{line-height:1.65}.legal ul{padding-left:20px}.legal li{margin:4px 0}
.legal .draft{margin:14px 0 6px}.lupd{color:var(--mut);font-size:13px;margin:8px 0}.ph{background:#fef3c7;color:#92400e;border-radius:6px;padding:1px 6px;font-weight:600;font-size:.92em}
.lglinks{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 8px}.lglinks a{padding:8px 14px;border:1px solid var(--line);border-radius:999px;font-size:13px;font-weight:600;text-decoration:none;color:inherit;background:#fff}.lglinks a[aria-current]{background:#0f766e;color:#fff;border-color:#0f766e}
.ltbl{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0}.ltbl th,.ltbl td{border-bottom:1px solid var(--line);padding:9px 8px;text-align:left;vertical-align:top}.ltbl th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}.ltbl code{font-size:12.5px;word-break:break-all}
.lop{margin-top:28px;font-size:13px;color:var(--mut)}.agree{font-size:12.5px;color:var(--mut);line-height:1.5;margin:10px 0 0;text-align:center}.agree a{color:inherit;text-decoration:underline}
@media(max-width:600px){.ltbl thead{display:none}.ltbl tr{display:block;border-bottom:1px solid var(--line);padding:6px 0}.ltbl td{display:block;border:0;padding:3px 0}}`;
const st=document.createElement('style');st.id='p26css';st.textContent=css;document.head.appendChild(st);
// re-render if the page was opened directly on a legal route before this file loaded
if(['terms','privacy','seller-terms','cookies'].includes(cur[0]))route(cur[0]);
})();
