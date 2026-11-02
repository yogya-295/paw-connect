const petGrid = document.getElementById('petGrid');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');
const emptyState = document.getElementById('emptyState');
const modal = document.getElementById('adoptModal');
const form = document.getElementById('adoptForm');
const feedback = document.getElementById('formFeedback');
let activeType = 'All';
let searchTimer;
let favoritesOnly = false;
let favorites = new Set(JSON.parse(localStorage.getItem('pawconnect-favorites') || '[]').map(Number));
document.getElementById('year').textContent = new Date().getFullYear();

function escapeHTML(value) {
 return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function saveFavorites() {
 localStorage.setItem('pawconnect-favorites', JSON.stringify([...favorites]));
 document.getElementById('savedCount').textContent = favorites.size;
}
function showToast(message) {
 const toast = document.getElementById('toast');
 toast.textContent = message;
 toast.classList.add('show');
 clearTimeout(showToast.timer);
 showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}
async function loadStats() {
 try {
  const res = await fetch('/api/stats');
  if (!res.ok) return;
  const stats = await res.json();
  document.getElementById('statAvailable').textContent = stats.availablePets;
  document.getElementById('statConnections').textContent = stats.successfulConnections;
 } catch (_) { /* stats are an enhancement; the pet list can still work */ }
}
async function loadPets() {
 petGrid.innerHTML = '<div class="loading">Finding your future best friend...</div>';
 const params = new URLSearchParams({type:activeType,search:searchInput.value.trim(),sort:document.getElementById('sortSelect').value});
 try {
  const response = await fetch(`/api/pets?${params}`);
  if (!response.ok) throw new Error('Could not load pets');
  let pets = await response.json();
  if (favoritesOnly) pets = pets.filter(pet => favorites.has(Number(pet.id)));
  petGrid.innerHTML = '';
  emptyState.classList.toggle('hidden', pets.length !== 0);
  document.getElementById('resultsNote').textContent = `${pets.length} ${pets.length === 1 ? 'friend' : 'friends'} found`;
  if (!pets.length) return;
  pets.forEach(pet => {
   const isSaved = favorites.has(Number(pet.id));
   const card = document.createElement('article');
   card.className = 'pet-card';
   card.innerHTML = `<div class="pet-photo"><img loading="lazy" src="${escapeHTML(pet.image)}" alt="${escapeHTML(pet.name)} the ${escapeHTML(pet.type)}" onerror="this.src='https://placehold.co/700x500/e9e8df/334b3b?text=Paw+Connect'"><span class="pet-type">${escapeHTML(pet.type)}</span><button class="heart-btn ${isSaved?'is-saved':''}" aria-label="${isSaved?'Remove':'Save'} ${escapeHTML(pet.name)} ${isSaved?'from':'to'} saved pets" title="Save for later">${isSaved?'♥':'♡'}</button></div>
    <div class="pet-info"><div class="pet-title-line"><h3>${escapeHTML(pet.name)}</h3><span class="pet-age">${escapeHTML(pet.age)}</span></div><div class="pet-location">⌖ ${escapeHTML(pet.location)}</div><p class="pet-description">${escapeHTML(pet.description)}</p><div class="pet-bottom"><span>● Available for adoption</span><button class="adopt-btn">Meet ${escapeHTML(pet.name)} <span>↗</span></button></div></div>`;
   card.querySelector('.heart-btn').addEventListener('click', () => {
    const id = Number(pet.id);
    if (favorites.has(id)) { favorites.delete(id); showToast('Removed from saved friends'); }
    else { favorites.add(id); showToast('Saved to your favourites'); }
    saveFavorites();
    loadPets();
   });
   card.querySelector('.adopt-btn').addEventListener('click', () => openAdopt(pet));
   petGrid.appendChild(card);
  });
 } catch (_) {
  petGrid.innerHTML = '<div class="loading">Could not connect to the server. Please run <b>npm start</b> and refresh.</div>';
 }
}
function openAdopt(pet) {
 form.reset();
 document.getElementById('petId').value = pet.id;
 document.getElementById('modalPet').innerHTML = `<img src="${escapeHTML(pet.image)}" alt="${escapeHTML(pet.name)}">`;
 document.getElementById('modalTitle').textContent = `Say hello to ${pet.name}.`;
 feedback.textContent = '';
 feedback.className = 'feedback';
 modal.classList.remove('hidden');
 document.body.style.overflow = 'hidden';
}
function closeModal() { modal.classList.add('hidden'); document.body.style.overflow = ''; }
document.getElementById('closeModal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
filterTabs.addEventListener('click', e => {
 const favoriteButton = e.target.closest('#favoritesOnly');
 if (favoriteButton) {
  favoritesOnly = !favoritesOnly;
  favoriteButton.classList.toggle('active', favoritesOnly);
  favoriteButton.textContent = favoritesOnly ? '♥ Saved only (' : '♡ Saved (';
  const count = document.createElement('span'); count.id = 'savedCount'; count.textContent = favorites.size;
  favoriteButton.append(count, ')');
  loadPets(); return;
 }
 const button = e.target.closest('button[data-type]');
 if (!button) return;
 activeType = button.dataset.type;
 filterTabs.querySelectorAll('button[data-type]').forEach(b => b.classList.toggle('active', b === button));
 loadPets();
});
searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadPets, 220); });
document.getElementById('sortSelect').addEventListener('change', loadPets);
form.addEventListener('submit', async e => {
 e.preventDefault();
 const submit = form.querySelector('button[type=submit]');
 submit.disabled = true; submit.textContent = 'Sending your request...'; feedback.textContent = '';
 const data = Object.fromEntries(new FormData(form).entries());
 data.pet_id = Number(document.getElementById('petId').value);
 try {
  const response = await fetch('/api/adoption-requests', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong');
  feedback.textContent = `${result.message} Reference #${result.request_id}.`;
  feedback.className = 'feedback'; form.reset(); loadStats();
  setTimeout(closeModal, 2600);
 } catch (err) { feedback.textContent = err.message; feedback.className = 'feedback error'; }
 finally { submit.disabled = false; submit.innerHTML = 'Send adoption request <span>↗</span>'; }
});
document.getElementById('menuToggle').addEventListener('click', () => document.querySelector('.topbar nav').classList.toggle('open'));
document.querySelectorAll('.topbar nav a').forEach(a => a.addEventListener('click', () => document.querySelector('.topbar nav').classList.remove('open')));
saveFavorites(); loadStats(); loadPets();

// Optional profile, stray-animal reporting and shelter partner workflows.
function setFeedback(id, message, error=false) {
 const el=document.getElementById(id); if(!el)return; el.textContent=message; el.classList.toggle('error',error);
}
function renderShelters(items, targetId) {
 const target=document.getElementById(targetId); if(!target)return;
 if(!items.length){target.textContent='No approved partners found for this city yet. You can still submit a report; the founder will review it.';return;}
 target.innerHTML=items.map(s=>`<div class="nearby-card"><strong>${escapeHTML(s.name)} · ${escapeHTML(s.kind)}</strong><span>${escapeHTML(s.city)} — ${escapeHTML(s.address)}</span><span>${escapeHTML(s.services)}</span><span>Contact: ${escapeHTML(s.phone)} · ${escapeHTML(s.email)}</span></div>`).join('');
}
document.getElementById('strayForm')?.addEventListener('submit',async e=>{
 e.preventDefault(); const formEl=e.currentTarget, button=formEl.querySelector('button[type=submit]');
 button.disabled=true; button.textContent='Sending report…'; setFeedback('strayFeedback','Uploading photo and sending report…');
 try {
  const response=await fetch('/api/stray-reports',{method:'POST',body:new FormData(formEl)}); const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Could not submit report.');
  setFeedback('strayFeedback',`${result.message} Reference #${result.report_id}.`); renderShelters(result.nearby_shelters||[],'nearbyResults'); formEl.reset(); loadStats();
 } catch(err){setFeedback('strayFeedback',err.message,true);} finally{button.disabled=false;button.textContent='Send rescue report ↗';}
});
document.getElementById('shelterForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const formEl=e.currentTarget,button=formEl.querySelector('button[type=submit]');button.disabled=true;setFeedback('shelterFeedback','Submitting partner details…');
 try{const response=await fetch('/api/shelters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(formEl).entries()))});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not submit details.');setFeedback('shelterFeedback',`${result.message} Reference #${result.submission_id}.`);formEl.reset();}
 catch(err){setFeedback('shelterFeedback',err.message,true);}finally{button.disabled=false;button.textContent='Submit partner details ↗';}
});
document.getElementById('shelterSearchForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const city=document.getElementById('shelterCity').value.trim();const target=document.getElementById('shelterResults');target.textContent='Searching approved partners…';
 try{const response=await fetch(`/api/shelters?city=${encodeURIComponent(city)}`);const rows=await response.json();if(!response.ok)throw new Error('Search failed.');renderShelters(rows,'shelterResults');}catch(_){target.textContent='Could not load partners right now.';}
});
document.getElementById('profileForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const formEl=e.currentTarget,button=formEl.querySelector('button[type=submit]');button.disabled=true;setFeedback('profileFeedback','Creating your optional profile…');
 try{const response=await fetch('/api/profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(formEl).entries()))});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not create profile.');const data=Object.fromEntries(new FormData(formEl).entries());localStorage.setItem('pawconnect-profile',JSON.stringify({display_name:data.display_name,email:data.email,phone:data.phone,city:data.city,profile_id:result.profile_id}));setFeedback('profileFeedback',`${result.message} Profile #${result.profile_id}. You can still use the site without signing in.`);formEl.reset();}
 catch(err){setFeedback('profileFeedback',err.message,true);}finally{button.disabled=false;button.textContent='Create my profile ↗';}
});
// Pre-fill adoption form from optional local profile, without requiring an account/login.
form.addEventListener('focusin',()=>{try{const p=JSON.parse(localStorage.getItem('pawconnect-profile')||'null');if(!p)return;for(const key of ['applicant_name','email','phone']){const input=form.elements[key];const value=key==='applicant_name'?p.display_name:p[key];if(input&&!input.value&&value)input.value=value;}}catch(_){}});

async function loadDonationTransparency(){
 const totals=document.getElementById('donationTotals'), target=document.getElementById('donationUses'); if(!totals)return;
 try{const r=await fetch('/api/donation-transparency');const d=await r.json();if(!r.ok)throw new Error();const money=n=>'₹'+(n/100).toLocaleString('en-IN',{maximumFractionDigits:2});totals.innerHTML=`<div class="nearby-card"><strong>Verified donations: ${money(d.verified_donations_paise)}</strong><span>Published documented animal-care expenses: ${money(d.published_use_paise)}</span></div>`;target.innerHTML=d.uses.length?d.uses.map(u=>`<div class="nearby-card"><strong>${escapeHTML(u.purpose)}</strong><span>Amount used: ${money(u.amount_paise)} · ${escapeHTML(u.created_at)}</span><a href="${escapeHTML(u.proof_url)}" target="_blank" rel="noopener">View receipt / proof ↗</a></div>`).join(''):'<p class="field-help">No expense proofs have been published yet. The founder will add verified receipts here.</p>';}catch(_){totals.textContent='Transparency ledger is temporarily unavailable.';}
}
document.getElementById('donationForm')?.addEventListener('submit',async e=>{e.preventDefault();const formEl=e.currentTarget,button=formEl.querySelector('button[type=submit]');button.disabled=true;setFeedback('donationFeedback','Recording donation details…');try{const response=await fetch('/api/donations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(formEl).entries()))});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not record donation.');setFeedback('donationFeedback',`Record #${result.donation_id}: ${result.message}`);formEl.reset();}catch(err){setFeedback('donationFeedback',err.message,true);}finally{button.disabled=false;button.textContent='Record my donation ↗';}});
loadDonationTransparency();
