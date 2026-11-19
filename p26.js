/* p26: legal pages (Terms, Privacy, Seller Terms, Cookies) at /terms /privacy /seller-terms /cookies.
   ShopNip is a service operated by Suman Bros (Wholesale) Limited. Company details taken from this
   repo and https://www.sumanbros.com/terms-conditions. Placeholders are marked [ ... ]. */
(()=>{
const CFG=window.APP_CONFIG||{};
const PH=t=>`<span class="ph">[${t}]</span>`;
const MAIL=()=>CFG.CONTACT_EMAIL?`<a href="mailto:${esc(CFG.CONTACT_EMAIL)}">${esc(CFG.CONTACT_EMAIL)}</a>`:PH('CONTACT EMAIL');
const CONTACT=()=>`through the <a href="/contact">Contact page</a> or by emailing ${MAIL()}`;
const OP='ShopNip is a service operated by Suman Bros (Wholesale) Limited';
const COINFO='Suman Bros (Wholesale) Limited is registered in England and Wales, company number 01802958. Registered address: Crown House, Otterspool Way, Watford WD25 8HL, United Kingdom. VAT number: GB 923 290 828. Telephone: 01923 200900';
const UPD='Last updated 14 November 2026';
const LINKS=k=>`<nav class="lglinks" aria-label="Legal pages">${[['terms','Terms of Use'],['privacy','Privacy Policy'],['seller-terms','Seller Terms'],['cookies','Cookie Notice']].map(([h,l])=>`<a href="/${h}"${h===k?' aria-current="page"':''}>${l}</a>`).join('')}</nav>`;
const page=(k,title,intro,body)=>`<article class="info legal"><div class="ih"><div class="tag">Legal</div><h1>${title}</h1><p>${intro}</p></div>
 <p class="lupd">${UPD}</p>${LINKS(k)}${body}
 <p class="lop">${OP}. ${COINFO}.</p></article>${foot()}`;

V.terms=()=>page('terms','Terms of Use','The rules for using ShopNip as a shopper. Please read them before you place an order.',`
<h2>1. Who we are</h2>
<p>${OP} ("ShopNip", "we", "us"). ${COINFO}. You can reach us ${CONTACT()}.</p>
<h2>2. What ShopNip does</h2>
<p>ShopNip is a website where you can find products at independent local shops and place orders with them for click &amp; collect or local delivery. <b>When you place an order, your contract of sale is with the shop</b>, not with Suman Bros or ShopNip. The shop is responsible for its products, prices, stock, collection, delivery, refunds and returns, except where the law says we are responsible too.</p>
<h2>3. Your account</h2>
<ul>
<li>You must be 18 or over to create an account.</li>
<li>Give accurate details, and keep your password private. You are responsible for activity on your account.</li>
<li>You can close your account at any time by contacting us.</li>
<li>We may suspend or close accounts that break these terms, place fake orders or misuse the service.</li>
</ul>
<h2>4. Prices, orders and payment</h2>
<ul>
<li>Prices are set by each shop and shown in pounds sterling. The price you see when you place the order is the price you pay, plus any delivery fee shown at checkout.</li>
<li>An order is a request to the shop. It is only confirmed when the shop accepts it.</li>
<li><b>You pay by card or at the shop.</b> When a shop takes cards, the card is charged when the shop accepts, and only for the final total. Otherwise you pay the shop on collection or delivery, by card or cash. ShopNip wallet credit can still cover all or part of the total.</li>
<li><b>Once you have placed an order, the total you are asked to pay can only go down, never up.</b> If an item is missing, declined, refunded or swapped for something cheaper, the amount due is reduced accordingly.</li>
</ul>
<h2>5. Click &amp; collect</h2>
<p>When your order is ready, we show you a collection code and PIN. Give these to the shop when you collect. Keep them private: anyone with your PIN may be able to collect your order. Collect during the shop's opening hours, and bring proof of the order if the shop asks.</p>
<h2>6. Delivery</h2>
<p>Delivery is only offered when the shop delivers to your area, or when a ShopNip delivery window is available. You see the delivery fee (if any) and any time window at checkout before you order. Someone should be available to take the delivery. For some ShopNip deliveries the driver may leave a proof-of-delivery photo on your order.</p>
<h2>7. If something is out of stock</h2>
<p>At checkout you choose what the shop should do if an item is out of stock:</p>
<ul>
<li><b>Refund it</b> — that item is taken off your total straight away.</li>
<li><b>Swap for the same price or less</b> — the shop may replace it with something else that is not dearer than what you chose.</li>
<li><b>Ask me first</b> — the shop checks with you before changing anything.</li>
</ul>
<p>You can also tick items as key items. If a key item is out of stock, the whole order is cancelled. You are told what the shop has done.</p>
<h2>8. If a shop declines your order</h2>
<p>A shop can decline an order, for example if it cannot fulfil it in time or an item is unavailable. You will be told. Because you pay on collection or delivery, you will not have paid the shop. Any ShopNip wallet credit used on that order is returned to your wallet.</p>
<h2>9. Cancelling and your cooling-off rights</h2>
<p>You can cancel an order on ShopNip until the shop accepts it, for any reason and at no cost.</p>
<p>If you are a consumer and you ordered on this website, you also usually have a legal right to change your mind under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013. That cooling-off period is 14 days from the day you receive the goods (or the last of them, if they arrive separately). Tell us or the shop clearly that you want to cancel, then return the goods within 14 days. Unless the goods are faulty or not as described, you normally pay the cost of sending them back.</p>
<p>This cooling-off right does not apply to everything. In particular, it usually does not apply to:</p>
<ul>
<li>goods made to your specification or clearly personalised;</li>
<li>goods that deteriorate or expire quickly;</li>
<li>sealed goods that are not suitable for return for health or hygiene reasons, if you unseal them after delivery or collection;</li>
<li>sealed audio, video or software, if you unseal them;</li>
<li>goods mixed inseparably with other items after delivery or collection;</li>
<li>newspapers, periodicals or magazines, other than subscriptions.</li>
</ul>
<p>If you asked us or the shop to start delivery or another service during the cooling-off period, and that service is fully performed with your agreement, you may lose the right to cancel that service (for example a delivery fee already incurred).</p>
<h2>10. Refunds, returns and problems</h2>
<p>Returns of goods are handled with the shop. If you paid by card, a refund goes back to that card. If you paid at the shop, a ShopNip refund is <b>wallet credit</b> you can spend on a later order (see My Wallet in your account). You can also agree a refund with the shop.</p>
<p><b>A refund will never be more than you paid</b> for the order, including any delivery fee that is being refunded. If only part of an order is refunded, we only refund that part.</p>
<p>If something is faulty or not as described, your rights under the Consumer Rights Act 2015 still apply (for example a repair, a replacement or a refund). Nothing in these terms limits those rights, or liability that cannot be limited by law.</p>
<p>If something goes wrong, use <b>Report a problem</b> on the order page, or contact us ${CONTACT()}. We will look into it with the shop.</p>
<h2>11. Using the site fairly</h2>
<p>Don't misuse ShopNip: no fake orders, no attempts to break or overload the site, no scraping, and no use that is unlawful or harms others.</p>
<h2>12. Our responsibility</h2>
<p>We work to keep ShopNip accurate and available, but we can't promise it will always be error-free or online. Product details come from shops and our catalogue and may contain mistakes. We are not responsible for a shop's products or for what happens between you and a shop, except where the law says we are. Nothing in these terms limits liability that cannot be limited by law, such as for death or personal injury caused by negligence, or fraud.</p>
<h2>13. Changes</h2>
<p>We may update these terms. If a change is important we will tell you on the site. The date at the top shows the latest version.</p>
<h2>14. Law</h2>
<p>These terms are governed by the law of England and Wales. If you live elsewhere in the UK, you can also bring a claim in your local courts.</p>`);

V.privacy=()=>page('privacy','Privacy Policy','What personal data ShopNip collects, why, and your rights under UK data protection law (UK GDPR and the Data Protection Act 2018).',`
<h2>1. Who is responsible</h2>
<p>${OP}, and Suman Bros (Wholesale) Limited is the data controller for the personal data described here. ${COINFO}. Contact us about privacy ${CONTACT()}.</p>
<p>We have not appointed a named Data Protection Officer. ${PH('ICO REGISTRATION NUMBER — add if the company is registered with the ICO')}.</p>
<h2>2. What we collect</h2>
<ul>
<li><b>Account details</b>: your email address, name and password (the password is stored securely by our provider; we can't see it).</li>
<li><b>Contact details</b>: your phone number, so the shop can call or text you about an order, and so we can reach you if we need to.</li>
<li><b>Address and postcode</b>: your postcode to show shops near you, and your delivery address if you choose delivery.</li>
<li><b>Location, only if you choose it</b>: if you tap "Use my location", your browser asks permission and sends your position once so we can check delivery. We don't track your location in the background.</li>
<li><b>Orders</b>: what you ordered, from which shop, collection or delivery, notes you add, out-of-stock choices, order status and history.</li>
<li><b>Proof-of-delivery photos</b>: for some deliveries, a photo (and sometimes the name of the person who took the order) to show the order was delivered.</li>
<li><b>Shop owners</b>: shop name, address, phone, opening hours, listings and the trade account email used to match wholesale orders.</li>
<li><b>Technical data</b>: basic logs kept by our hosting providers (such as IP address and browser type) for security.</li>
</ul>
<h2>3. Why we use it, and our lawful bases</h2>
<table class="ltbl"><thead><tr><th>Purpose</th><th>Lawful basis</th></tr></thead><tbody>
<tr><td>Creating and running your account</td><td>Contract</td></tr>
<tr><td>Passing your order to the shop you chose, and showing you its status</td><td>Contract</td></tr>
<tr><td>Showing nearby shops and checking delivery areas</td><td>Contract, or your consent when you use your device location</td></tr>
<tr><td>Giving your phone number to the shop so they can contact you about the order, and sending order alerts (SMS, WhatsApp or a phone call) through Twilio</td><td>Contract, and our legitimate interests in telling shops about new orders promptly</td></tr>
<tr><td>Storing proof-of-delivery photos on the order</td><td>Contract, and our legitimate interests in showing that a delivery was made</td></tr>
<tr><td>Keeping ShopNip secure and preventing misuse</td><td>Legitimate interests</td></tr>
<tr><td>Keeping records we are legally required to keep</td><td>Legal obligation</td></tr>
<tr><td>Sending deal emails, only if you sign up for them</td><td>Consent (you can unsubscribe at any time)</td></tr>
<tr><td>Taking card payments, if we start doing so, through Stripe</td><td>Contract, and legal obligation for payment records</td></tr>
</tbody></table>
<p>We don't sell your data and we don't use it for advertising.</p>
<h2>4. Who we share it with</h2>
<ul>
<li><b>The shop you order from</b> gets your name, phone, order details and, for delivery, your address.</li>
<li><b>Supabase</b> is our processor for the database, login and file storage (including proof-of-delivery photos). Its project for ShopNip is configured in the London (UK) region.</li>
<li><b>Vercel</b> hosts the website.</li>
<li><b>Twilio</b> sends order alerts by SMS, WhatsApp or phone call, mainly to shops.</li>
<li><b>Resend</b> sends transactional email, such as order and support emails.</li>
<li><b>postcodes.io</b> turns postcodes and locations into map positions. We send it only a postcode or coordinates, not your name.</li>
<li><b>Stripe</b>, if we take card payments, would process those payments. We will update this policy if that happens.</li>
</ul>
<p>Some of these providers may process data outside the UK. Where they do, we rely on a lawful UK transfer mechanism, such as the UK International Data Transfer Addendum or an adequacy regulation. ${PH('TRANSFER SAFEGUARDS — confirm the agreements in place with each processor')}.</p>
<h2>5. How long we keep it</h2>
<ul>
<li>Account details: while your account is open, then deleted or anonymised within ${PH('ACCOUNT CLOSURE DELETION PERIOD')} of you closing it, unless we must keep something longer.</li>
<li>Order records, including proof-of-delivery photos: up to 6 years, for accounting and dispute purposes.</li>
<li>Security logs: kept by our providers for a short period, usually no more than ${PH('SECURITY LOG RETENTION')}.</li>
<li>Data on your device: until you clear it (see our <a href="/cookies">Cookie Notice</a>).</li>
</ul>
<h2>6. Your rights</h2>
<p>You have the right to access your data, have it corrected or deleted, restrict or object to how we use it, take a copy to another service (portability), and withdraw consent at any time. To use any of these rights, contact us ${CONTACT()}. We will reply within one month.</p>
<p>If you're unhappy with how we handle your data, you can complain to the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" rel="noopener" target="_blank">ico.org.uk</a> or by writing to the ICO, Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF.</p>
<h2>7. Cookies and storage on your device</h2>
<p>ShopNip doesn't use advertising cookies. We use your browser's local storage, and a small number of other device stores, for things the site needs to work or that you ask for. The full list, and how consent works, is in our <a href="/cookies">Cookie Notice</a>.</p>
<h2>8. Children</h2>
<p>ShopNip is not meant for children under 18, and we don't knowingly collect their data.</p>
<h2>9. Changes</h2>
<p>We will update this page if we change how we use data. The date at the top shows the latest version.</p>`);

V['seller-terms']=()=>page('seller-terms','Seller Terms','The rules for shops that sell on ShopNip. They apply alongside our Terms of Use and Privacy Policy.',`
<h2>1. Who we are</h2>
<p>${OP} ("ShopNip", "we"). ${COINFO}. Contact us ${CONTACT()}.</p>
<h2>2. Joining and approval</h2>
<ul>
<li>You must be a genuine business with a physical shop, and the person signing up must be allowed to act for it.</li>
<li><b>We review every shop</b> before it goes live, and we may approve or decline it at our discretion.</li>
<li>Keep your shop details accurate: name, address, phone, opening hours, delivery area and trade account email.</li>
</ul>
<h2>3. Listings</h2>
<ul>
<li><b>Your listings must be accurate</b>: the right product, price, stock and photos. Update them when things change.</li>
<li>You set your own prices. A "was" price must be a price you genuinely charged.</li>
<li>Only list products you can lawfully sell. No illegal, unsafe, counterfeit or age-restricted items unless we have agreed it with you in writing.</li>
<li>Catalogue photos and descriptions are provided to help you. Check them, and tell us about any errors.</li>
</ul>
<h2>4. Orders and fulfilment</h2>
<ul>
<li>Accept or decline new orders promptly. Once you accept an order, you must fulfil it at the price shown.</li>
<li>Have click &amp; collect orders ready by the time shown to the customer, and keep order status up to date (accepted, ready, completed).</li>
<li>If you offer delivery, deliver only within the area and for the fee you set, in a reasonable time.</li>
<li>Follow the customer's out-of-stock choice (refund the item, swap for the same price or less, or ask first). If they marked an item as a key item and it is out of stock, cancel the order.</li>
<li>After an order is placed, the total the customer is asked to pay can only go down. A refund must never be more than the customer paid.</li>
<li>You are the seller. You are responsible for the goods, for refunds and returns, and for your obligations to customers under consumer law, including the Consumer Rights Act 2015 and the Consumer Contracts Regulations 2013.</li>
</ul>
<h2>5. Click &amp; collect PIN checks</h2>
<p>Each order has a collection PIN. <b>Before handing over an order, ask for the PIN and check it matches</b> the one shown in your order inbox. If the PIN doesn't match, don't hand the order over. ShopNip is not responsible for orders handed over without a matching PIN.</p>
<h2>6. Payment</h2>
<p><b>Customers pay you directly, at the shop or on delivery.</b> ShopNip does not take payments or hold money for you. You are responsible for taking payment, giving receipts and handling refunds. Refunds processed through ShopNip are given as ShopNip wallet credit to the customer, using Refund to wallet on the order, and must never exceed what the customer paid.</p>
<h2>7. Listing on ShopNip</h2>
<p><b>Your first 50 product listings are free.</b> If we introduce charges for further listings, we will give you notice first. Those details are only for shops, not for shoppers.</p>
<h2>8. Customer data</h2>
<p>You receive customer details (name, phone, and address for delivery) only to fulfil their order. You may also receive proof-of-delivery photos for deliveries you or ShopNip make. Use this information only for that order, keep it secure, and don't use it for marketing unless the customer has agreed separately. You are responsible for your own compliance with UK data protection law.</p>
<p>Order alerts may be sent to you by SMS, WhatsApp or phone call through our processor, Twilio. Keep the contact number on your shop profile up to date.</p>
<h2>9. Suspension and removal</h2>
<p>We may hide listings, or suspend or remove a shop, if it breaks these terms, receives repeated complaints, gives inaccurate information, or puts customers at risk. Where we reasonably can, we will tell you why and give you a chance to fix things first. You can close your shop at any time by contacting us.</p>
<h2>10. Our responsibility</h2>
<p>ShopNip may change over time. We aren't liable for lost sales or profits caused by the site being unavailable. Nothing in these terms limits liability that can't be limited by law.</p>
<h2>11. Changes and law</h2>
<p>We may update these terms and will tell you about important changes. The law of England and Wales applies.</p>`);

V.cookies=()=>{const rows=[
 ['nb_basket','Your basket (items, quantities and shop)','Until you check out or clear it'],
 ['nb_pc, nb_me, nb_r, nb_loc:last (and similar nb_loc keys)','Your postcode, map position and distance radius, used to show nearby shops and check delivery','Until you change or clear it'],
 ['nb_contact:…','Your name, phone and delivery address, to pre-fill checkout','Until you clear it or sign out'],
 ['nb_ninja','Whether the ShopNip ninja animation is on or off','Until you change the toggle or clear it'],
 ['sb-…-auth-token','Keeps you signed in (set by Supabase, our login provider)','Until you sign out'],
 ['nb_recent','Recently viewed and searched items, shown back to you','Until you clear it'],
 ['nb_notify','Items you asked to be told about when a nearby shop stocks them','Until you clear it'],
 ['nb_subs','Remembers that you signed up for deal emails on this browser','Until you clear it'],
 ['nb_src','How you arrived at ShopNip (for example a campaign link), used only if you later create an account','Up to 90 days, or until you clear it'],
 ['nb_visits, nb_inst_x','How often you have opened the site, and whether you dismissed the “add to Home Screen” prompt','Until you clear it, or the prompt dismissal expiry'],
 ['nb_rate_skip','Order ratings you chose to skip, so we don\u2019t ask again','Until you clear it'],
 ['nb_want, nb_partner_code, nb_markup, nb_desk, nb_rel, nb_social_v1','Seller or shop tools (for example a partner code, support desk cases, or display settings)','Until you clear them — these are for shop accounts, not everyday shopping'],
 ['nb_uk_ip_dismiss','Remembers that you dismissed the UK-availability message','Until you clear it'],
 ['Session storage (nb_next, nb_nt and similar)','A one-off return path or message, so it isn\u2019t shown twice in the same tab','Until you close the tab'],
 ['Service worker cache','Saves the site\u2019s files so it loads quickly and can work offline','Until the site updates or you clear site data']
];
 return page('cookies','Cookie Notice','How ShopNip uses cookies and similar storage on your device, and when we need your consent.',`
<h2>The short version</h2>
<p>ShopNip doesn't use advertising or third-party analytics cookies. Almost everything we store is in your browser's <b>local storage</b> (or session storage), which works like a cookie, so that the site can do what you asked — for example keep your basket, remember your postcode, or keep you signed in.</p>
<p>Storage that is <b>strictly necessary</b> for a service you request (your basket, login, checkout details, postcode and the service worker that makes the site work) does not need prior consent under UK cookie law (the Privacy and Electronic Communications Regulations). Optional preferences, such as turning the ninja animation off (<code>nb_ninja</code>) or dismissing the install prompt, are also stored on your device so we can remember your choice. You can change or clear them at any time.</p>
<p>If we ever add optional advertising or analytics cookies, we will ask for your consent first, and you will be able to say no.</p>
<h2>What we store</h2>
<table class="ltbl"><thead><tr><th>Name</th><th>What it's for</th><th>How long</th></tr></thead><tbody>${rows.map(r=>`<tr><td><code>${r[0]}</code></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
<h2>Other connections</h2>
<p>The site loads the Plus Jakarta Sans font from Google Fonts, so your browser connects to Google to fetch the font files. Google may receive your IP address. Postcode lookups go to postcodes.io. Login, data storage and files (including proof-of-delivery photos) are provided by Supabase. The site is hosted by Vercel. Order alert messages may be sent by Twilio, and emails by Resend. These are described in our <a href="/privacy">Privacy Policy</a>.</p>
<h2>Your choices</h2>
<p>You can clear this data at any time in your browser settings (for example "Clear site data" for www.shopnip.co.uk). If you do, your basket, postcode and ninja preference will be forgotten and you will be signed out. You can also turn the ninja off from your account page without clearing everything else.</p>
<h2>More</h2>
<p>See our <a href="/privacy">Privacy Policy</a>, or contact us ${CONTACT()}.</p>`)};

const css=`.legal{max-width:820px}.legal h2{font-size:19px;margin:26px 0 8px}.legal p,.legal li{line-height:1.65}.legal ul{padding-left:20px}.legal li{margin:4px 0}
.lupd{color:var(--mut);font-size:13px;margin:8px 0}.ph{background:#fef3c7;color:#92400e;border-radius:6px;padding:1px 6px;font-weight:600;font-size:.92em}
.lglinks{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 8px}.lglinks a{padding:8px 14px;border:1px solid var(--line);border-radius:999px;font-size:13px;font-weight:600;text-decoration:none;color:inherit;background:#fff}.lglinks a[aria-current]{background:#0f766e;color:#fff;border-color:#0f766e}
.ltbl{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0}.ltbl th,.ltbl td{border-bottom:1px solid var(--line);padding:9px 8px;text-align:left;vertical-align:top}.ltbl th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}.ltbl code{font-size:12.5px;word-break:break-all}
.lop{margin-top:28px;font-size:13px;color:var(--mut)}.agree{font-size:12.5px;color:var(--mut);line-height:1.5;margin:10px 0 0;text-align:center}.agree a{color:inherit;text-decoration:underline}
@media(max-width:600px){.ltbl thead{display:none}.ltbl tr{display:block;border-bottom:1px solid var(--line);padding:6px 0}.ltbl td{display:block;border:0;padding:3px 0}}`;
const st=document.createElement('style');st.id='p26css';st.textContent=css;document.head.appendChild(st);
if(['terms','privacy','seller-terms','cookies'].includes(cur[0]))route(cur[0]);
})();
