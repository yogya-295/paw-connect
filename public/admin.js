const $ = id => document.getElementById(id);
let adminKey = sessionStorage.getItem('pawconnect-admin-key') || '';
async function api(path, options={}) {
 const response = await fetch(path, { ...options, headers: { 'Content-Type':'application/json', 'X-Admin-Key':adminKey, ...(options.headers||{}) } });
 const data = await response.json().catch(()=>({error:'Unexpected server response.'}));
 if (!response.ok) throw new Error(data.error || 'Request failed.');
 return data;
}
function alertText(id, message, isError=false) { $(id).textContent = message; $(id).classList.toggle('error',isError); }
async function unlock(key) {
 const res = await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || 'Could not sign in.');
 adminKey=key; sessionStorage.setItem('pawconnect-admin-key',key);
 $('loginCard').classList.add('admin-hidden'); $('dashboard').classList.remove('admin-hidden');
 await refreshAll();
}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await unlock($('adminKey').value);alertText('loginFeedback','');}catch(err){alertText('loginFeedback',err.message,true);}});
async function refreshAll(){await Promise.all([loadSummary(),loadRequests()]);}
async function loadSummary(){
 const s=await api('/api/admin/summary');
 const items=[['All pets',s.totalPets],['Available',s.availablePets],['Pending requests',s.pending],['Approved',s.approved],['New stray reports',s.newReports],['Pending partners',s.partnerSubmissions]];
 $('statsCards').innerHTML=items.map(([label,value])=>`<div class="admin-stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
}
async function loadRequests(){
 const rows=await api('/api/admin/requests');
 $('requestsBody').innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${esc(r.applicant_name)}</strong><br><small>#${r.id}</small></td><td>${esc(r.pet_name)}</td><td>${esc(r.email)}<br>${esc(r.phone)}</td><td>${esc(r.message)}</td><td>${esc(r.created_at)}</td><td><select data-request-id="${r.id}" aria-label="Status for request ${r.id}">${['Pending','Approved','Declined'].map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join(''):'<tr><td colspan="6">No adoption requests yet. Submit a request from the main website to test this dashboard.</td></tr>';
 $('requestsBody').querySelectorAll('select[data-request-id]').forEach(select=>select.addEventListener('change',async()=>{try{await api(`/api/admin/requests/${select.dataset.requestId}`,{method:'PATCH',body:JSON.stringify({status:select.value})});alertText('requestsFeedback','Request status updated.');await loadSummary();}catch(err){alertText('requestsFeedback',err.message,true);}}));
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$('refreshRequests').addEventListener('click',async()=>{try{await refreshAll();alertText('requestsFeedback','Data refreshed.');}catch(err){alertText('requestsFeedback',err.message,true);}});
$('petForm').addEventListener('submit', async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const pet = await api('/api/admin/pets', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    form.reset();
    alertText(
      'petFeedback',
      `${pet.name} was added. Refresh the main website to see the listing.`
    );

    await loadSummary();
  } catch (err) {
    alertText('petFeedback', err.message, true);
  }
});

if (adminKey) {
  unlock(adminKey).catch(() => {
    sessionStorage.removeItem('pawconnect-admin-key');
    adminKey = '';
  });
}

async function loadReports(){
 const rows=await api('/api/admin/stray-reports');
 $('reportsBody').innerHTML=rows.length?rows.map(r=>`<tr><td><a href="${esc(r.image_path)}" target="_blank" rel="noopener"><img src="${esc(r.image_path)}" alt="Reported animal" style="width:84px;height:66px;object-fit:cover;border-radius:4px"></a><br><small>#${r.id}</small></td><td><strong>${esc(r.animal_type)}</strong><br>${esc(r.description)}<br><small>Landmark: ${esc(r.landmark||'Not provided')}</small></td><td>${esc(r.location)}</td><td>${esc(r.reporter_name)}<br>${esc(r.reporter_phone)}</td><td><strong>${esc(r.urgency)}</strong><br>${esc(r.created_at)}</td><td><select data-report-id="${r.id}">${['New','Contacted','Referred to shelter','Resolved','Closed'].map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join(''):'<tr><td colspan="6">No stray reports yet. Reports submitted through the public form will appear here.</td></tr>';
 $('reportsBody').querySelectorAll('select[data-report-id]').forEach(sel=>sel.addEventListener('change',async()=>{try{await api(`/api/admin/stray-reports/${sel.dataset.reportId}`,{method:'PATCH',body:JSON.stringify({status:sel.value})});alertText('reportsFeedback','Report status updated.');await loadSummary();}catch(err){alertText('reportsFeedback',err.message,true);}}));
}
async function loadShelters(){
 const rows=await api('/api/admin/shelters');
 $('sheltersBody').innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${esc(r.name)}</strong><br>${esc(r.kind)}<br><small>#${r.id}</small></td><td>${esc(r.contact_name)}<br>${esc(r.phone)}<br>${esc(r.email)}</td><td>${esc(r.city)}<br>${esc(r.address)}</td><td>${esc(r.services)}</td><td><select data-shelter-id="${r.id}">${['Pending','Approved','Declined'].map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join(''):'<tr><td colspan="5">No partner submissions yet.</td></tr>';
 $('sheltersBody').querySelectorAll('select[data-shelter-id]').forEach(sel=>sel.addEventListener('change',async()=>{try{await api(`/api/admin/shelters/${sel.dataset.shelterId}`,{method:'PATCH',body:JSON.stringify({status:sel.value})});alertText('sheltersFeedback','Partner review status updated.');await loadSummary();}catch(err){alertText('sheltersFeedback',err.message,true);}}));
}
const previousRefreshAll=refreshAll;
refreshAll=async function(){await Promise.all([loadSummary(),loadRequests(),loadReports(),loadShelters()]);};
$('refreshReports')?.addEventListener('click',async()=>{try{await loadReports();alertText('reportsFeedback','Reports refreshed.');}catch(err){alertText('reportsFeedback',err.message,true);}});
$('refreshShelters')?.addEventListener('click',async()=>{try{await loadShelters();alertText('sheltersFeedback','Partner submissions refreshed.');}catch(err){alertText('sheltersFeedback',err.message,true);}});

async function loadDonations(){const rows=await api('/api/admin/donations');$('donationsBody').innerHTML=rows.length?rows.map(d=>`<tr><td><strong>${esc(d.donor_name)}</strong><br><small>#${d.id}</small><br>${esc(d.donor_email||'No email')}</td><td>₹${(d.amount_paise/100).toLocaleString('en-IN',{maximumFractionDigits:2})}</td><td>${esc(d.payment_reference||'Not provided')}</td><td>${esc(d.message||'—')}<br><small>${esc(d.created_at)}</small></td><td><select data-donation-id="${d.id}">${['Pending verification','Verified','Rejected'].map(s=>`<option ${s===d.payment_status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join(''):'<tr><td colspan="5">No donation records yet.</td></tr>';$('donationsBody').querySelectorAll('select[data-donation-id]').forEach(sel=>sel.addEventListener('change',async()=>{try{await api(`/api/admin/donations/${sel.dataset.donationId}`,{method:'PATCH',body:JSON.stringify({payment_status:sel.value})});alertText('donationsFeedback','Donation status updated.');await loadSummary();}catch(err){alertText('donationsFeedback',err.message,true);}}));}
const oldRefreshAll=refreshAll;refreshAll=async function(){await Promise.all([loadSummary(),loadRequests(),loadReports(),loadShelters(),loadDonations()]);};
$('refreshDonations')?.addEventListener('click',async()=>{try{await loadDonations();alertText('donationsFeedback','Donation records refreshed.');}catch(err){alertText('donationsFeedback',err.message,true);}});
$('donationUseForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const r = await api('/api/admin/donation-uses', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    form.reset();
    alertText(
      'donationUseFeedback',
      `Proof #${r.id} published on the public transparency ledger.`
    );
  } catch (err) {
    alertText('donationUseFeedback', err.message, true);
  }
});
