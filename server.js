const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Database = require('better-sqlite3');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = process.env.ADMIN_KEY;
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const db = new Database(path.join(__dirname, 'pawconnect.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${path.extname(file.originalname).toLowerCase()}`)
});
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(new Error('Please upload a JPG, PNG or WEBP image (max 5 MB).'));
    cb(null, true);
  }
});

const requestBuckets = new Map();
app.use('/api', (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const bucket = requestBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > 60_000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1; requestBuckets.set(key, bucket);
  if (bucket.count > 180) return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
  next();
});

db.exec(`
CREATE TABLE IF NOT EXISTS pets (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, age TEXT NOT NULL,
 location TEXT NOT NULL, description TEXT NOT NULL, image TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'Available', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS adoption_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT, pet_id INTEGER NOT NULL, applicant_name TEXT NOT NULL,
 email TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(pet_id) REFERENCES pets(id)
);
CREATE TABLE IF NOT EXISTS profiles (
 id INTEGER PRIMARY KEY AUTOINCREMENT, display_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 phone TEXT NOT NULL, city TEXT NOT NULL, about TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS stray_reports (
 id INTEGER PRIMARY KEY AUTOINCREMENT, animal_type TEXT NOT NULL, description TEXT NOT NULL,
 location TEXT NOT NULL, landmark TEXT NOT NULL DEFAULT '', urgency TEXT NOT NULL DEFAULT 'Normal',
 image_path TEXT NOT NULL, reporter_name TEXT NOT NULL, reporter_phone TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'New', assigned_shelter_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shelters (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL, contact_name TEXT NOT NULL,
 phone TEXT NOT NULL, email TEXT NOT NULL, city TEXT NOT NULL, address TEXT NOT NULL,
 services TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS donations (
 id INTEGER PRIMARY KEY AUTOINCREMENT, donor_name TEXT NOT NULL, donor_email TEXT NOT NULL DEFAULT '', amount_paise INTEGER NOT NULL, message TEXT NOT NULL DEFAULT '', payment_reference TEXT NOT NULL DEFAULT '', payment_status TEXT NOT NULL DEFAULT 'Pending verification', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS donation_uses (
 id INTEGER PRIMARY KEY AUTOINCREMENT, amount_paise INTEGER NOT NULL, purpose TEXT NOT NULL, proof_url TEXT NOT NULL, donation_ids TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Demo listings are Indian community animals only; replace/add real cases with permission.
if (db.prepare('SELECT COUNT(*) AS n FROM pets').get().n === 0) {
  const insert = db.prepare('INSERT INTO pets (name,type,age,location,description,image) VALUES (?,?,?,?,?,?)');
  const pets = [
    ['Sheru — Indie dog','Dog','Approx. 2 years','Yamuna Nagar, Haryana','A friendly Indian pariah dog from the local community. Looking for a safe, caring home.','https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=85'],
    ['Gudiya — street cat','Cat','Approx. 8 months','Yamuna Nagar, Haryana','A gentle Indian street cat who needs a patient family and a secure indoor space.','https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=85'],
    ['Moti — Indie dog','Dog','Approx. 1 year','Ambala, Haryana','A playful Indian indie dog. Adoption should include a vet check and vaccination plan.','https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=85'],
    ['Chutki — street cat','Cat','Approx. 6 months','Chandigarh','A curious community cat seeking a safe home with someone who understands slow introductions.','https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=85']
  ];
  db.transaction(rows => rows.forEach(p => insert.run(...p)))(pets);
}
const clean = (v, max = 500) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const validTypes = new Set(['Dog','Cat','Rabbit','Bird','Other']);
const validAnimalTypes = new Set(['Indian street dog / Indie','Indian street cat','Cow / cattle','Monkey','Bird','Other']);
const validImage = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; } };
const adminOnly = (req, res, next) => {
  const key = req.get('x-admin-key');
  if (!key || key !== ADMIN_KEY) return res.status(401).json({ error: 'Founder/admin access required. Enter the correct admin key.' });
  next();
};
const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Paw Connect', version: '3.0.0' }));
app.get('/api/stats', (_req, res) => res.json({
  availablePets: db.prepare("SELECT COUNT(*) AS n FROM pets WHERE status='Available'").get().n,
  successfulConnections: db.prepare("SELECT COUNT(*) AS n FROM adoption_requests WHERE status='Approved'").get().n,
  reports: db.prepare("SELECT COUNT(*) AS n FROM stray_reports WHERE status NOT IN ('Resolved','Closed')").get().n
}));
app.get('/api/pets', (req, res) => {
  const search = clean(req.query.search, 100), type = clean(req.query.type || 'All', 20), sort = clean(req.query.sort || 'newest', 20);
  let sql = "SELECT * FROM pets WHERE status='Available'"; const args = [];
  if (type !== 'All' && validTypes.has(type)) { sql += ' AND type=?'; args.push(type); }
  if (search) { sql += ' AND (name LIKE ? OR location LIKE ? OR description LIKE ?)'; args.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  const order = sort === 'name' ? 'name COLLATE NOCASE ASC' : sort === 'oldest' ? 'id ASC' : 'id DESC';
  res.json(db.prepare(`${sql} ORDER BY ${order}`).all(...args));
});
app.get('/api/pets/:id', (req, res) => { const pet = db.prepare('SELECT * FROM pets WHERE id=?').get(Number(req.params.id)); if (!pet) return res.status(404).json({error:'Pet not found'}); res.json(pet); });

// No visitor login is required. Profiles are optional and can be created at any time.
app.post('/api/profiles', (req, res) => {
  const display_name=clean(req.body.display_name,100), email=clean(req.body.email,150).toLowerCase(), phone=clean(req.body.phone,25), city=clean(req.body.city,100), about=clean(req.body.about,500);
  if (!display_name || !validEmail(email) || phone.replace(/\D/g,'').length < 7 || !city) return res.status(400).json({error:'Enter your name, valid email, phone and city.'});
  try { const r=db.prepare('INSERT INTO profiles (display_name,email,phone,city,about) VALUES (?,?,?,?,?)').run(display_name,email,phone,city,about); res.status(201).json({success:true,profile_id:r.lastInsertRowid,message:'Your optional profile has been created.'}); }
  catch(e) { if (String(e.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({error:'A profile with this email already exists. Try another email.'}); throw e; }
});

app.post('/api/adoption-requests', (req,res) => {
  const petId=Number(req.body.pet_id), applicant_name=clean(req.body.applicant_name,100), email=clean(req.body.email,150).toLowerCase(), phone=clean(req.body.phone,25), message=clean(req.body.message,1000);
  if (!Number.isInteger(petId)||petId<1||!applicant_name||!email||!phone||!message) return res.status(400).json({error:'Please complete all fields.'});
  if (!validEmail(email)) return res.status(400).json({error:'Please enter a valid email.'});
  if (phone.replace(/\D/g,'').length<7) return res.status(400).json({error:'Please enter a valid phone number.'});
  const pet=db.prepare("SELECT * FROM pets WHERE id=? AND status='Available'").get(petId); if(!pet) return res.status(404).json({error:'This pet is no longer available.'});
  const result=db.prepare('INSERT INTO adoption_requests (pet_id,applicant_name,email,phone,message) VALUES (?,?,?,?,?)').run(petId,applicant_name,email,phone,message);
  res.status(201).json({message:'Your adoption request has been sent privately to the Paw Connect founder for review.',request_id:result.lastInsertRowid});
});

app.post('/api/stray-reports', (req,res,next) => imageUpload.single('photo')(req,res,err=>{ if(err) return res.status(400).json({error:err.message}); next(); }), (req,res) => {
  const animal_type=clean(req.body.animal_type,60), description=clean(req.body.description,1000), location=clean(req.body.location,120), landmark=clean(req.body.landmark,180), urgency=clean(req.body.urgency,20), reporter_name=clean(req.body.reporter_name,100), reporter_phone=clean(req.body.reporter_phone,25);
  if(!req.file) return res.status(400).json({error:'Please upload a clear photo of the animal.'});
  if(!validAnimalTypes.has(animal_type)||!description||!location||!reporter_name||reporter_phone.replace(/\D/g,'').length<7){fs.unlink(req.file.path,()=>{});return res.status(400).json({error:'Complete all required details and enter a valid contact number.'});}
  const r=db.prepare('INSERT INTO stray_reports (animal_type,description,location,landmark,urgency,image_path,reporter_name,reporter_phone) VALUES (?,?,?,?,?,?,?,?)').run(animal_type,description,location,landmark,['Urgent','High','Normal'].includes(urgency)?urgency:'Normal',`/uploads/${req.file.filename}`,reporter_name,reporter_phone);
  const city=location.split(',')[0].trim();
  const shelters=db.prepare("SELECT id,name,kind,phone,email,city,address,services FROM shelters WHERE status='Approved' AND lower(city)=lower(?) ORDER BY name").all(city);
  res.status(201).json({success:true,report_id:r.lastInsertRowid,message:'Report sent to the Paw Connect founder for follow-up.',nearby_shelters:shelters});
});

app.post('/api/donations',(req,res)=>{
 const donor_name=clean(req.body.donor_name,100), donor_email=clean(req.body.donor_email,150).toLowerCase(), message=clean(req.body.message,400), payment_reference=clean(req.body.payment_reference,120);
 const amount=Number(req.body.amount);
 if(!donor_name||!Number.isFinite(amount)||amount<1||amount>1000000||Math.round(amount*100)!==amount*100) return res.status(400).json({error:'Enter your name and a valid donation amount between ₹1 and ₹10,00,000.'});
 if(donor_email&&!validEmail(donor_email)) return res.status(400).json({error:'Enter a valid email address or leave it blank.'});
 const r=db.prepare('INSERT INTO donations (donor_name,donor_email,amount_paise,message,payment_reference) VALUES (?,?,?,?,?)').run(donor_name,donor_email,Math.round(amount*100),message,payment_reference);
 res.status(201).json({success:true,donation_id:r.lastInsertRowid,amount, payment_status:'Pending verification',message:`Donation record #${r.lastInsertRowid} created. This demo does not collect money or verify a payment; the founder must verify the payment separately.`});
});
app.get('/api/donation-transparency',(_req,res)=>{
 const totals=db.prepare("SELECT COALESCE(SUM(amount_paise),0) AS n FROM donations WHERE payment_status='Verified'").get().n;
 const used=db.prepare('SELECT COALESCE(SUM(amount_paise),0) AS n FROM donation_uses WHERE published=1').get().n;
 const uses=db.prepare('SELECT id,amount_paise,purpose,proof_url,created_at FROM donation_uses WHERE published=1 ORDER BY id DESC').all();
 res.json({verified_donations_paise:totals,published_use_paise:used,uses});
});
app.get('/api/shelters', (req,res) => {
 const city=clean(req.query.city,100); if(!city) return res.json([]);
 const rows=db.prepare("SELECT id,name,kind,phone,email,city,address,services FROM shelters WHERE status='Approved' AND lower(city)=lower(?) ORDER BY name").all(city.trim()); res.json(rows);
});
app.post('/api/shelters', (req,res) => {
 const name=clean(req.body.name,120),kind=clean(req.body.kind,30),contact_name=clean(req.body.contact_name,100),phone=clean(req.body.phone,25),email=clean(req.body.email,150).toLowerCase(),city=clean(req.body.city,100),address=clean(req.body.address,250),services=clean(req.body.services,600);
 if(!name||!['Animal shelter','NGO','Rescue volunteer','Veterinary clinic'].includes(kind)||!contact_name||phone.replace(/\D/g,'').length<7||!validEmail(email)||!city||!address||!services) return res.status(400).json({error:'Please complete all fields with valid contact details.'});
 const r=db.prepare('INSERT INTO shelters (name,kind,contact_name,phone,email,city,address,services) VALUES (?,?,?,?,?,?,?,?)').run(name,kind,contact_name,phone,email,city,address,services);
 res.status(201).json({success:true,submission_id:r.lastInsertRowid,message:'Partner details submitted privately to the Paw Connect founder. They will appear publicly only after approval.'});
});

app.post('/api/admin/login',(req,res)=>{if(clean(req.body.key,200)!==ADMIN_KEY)return res.status(401).json({error:'Incorrect admin key.'});res.json({success:true,message:'Founder/admin key accepted for this browser session.'});});
app.get('/api/admin/summary',adminOnly,(_req,res)=>res.json({
 totalPets:db.prepare('SELECT COUNT(*) AS n FROM pets').get().n, availablePets:db.prepare("SELECT COUNT(*) AS n FROM pets WHERE status='Available'").get().n,
 requests:db.prepare('SELECT COUNT(*) AS n FROM adoption_requests').get().n, pending:db.prepare("SELECT COUNT(*) AS n FROM adoption_requests WHERE status='Pending'").get().n,
 approved:db.prepare("SELECT COUNT(*) AS n FROM adoption_requests WHERE status='Approved'").get().n, declined:db.prepare("SELECT COUNT(*) AS n FROM adoption_requests WHERE status='Declined'").get().n,
 strayReports:db.prepare('SELECT COUNT(*) AS n FROM stray_reports').get().n, newReports:db.prepare("SELECT COUNT(*) AS n FROM stray_reports WHERE status='New'").get().n,
 partnerSubmissions:db.prepare("SELECT COUNT(*) AS n FROM shelters WHERE status='Pending'").get().n,
 donations:db.prepare('SELECT COUNT(*) AS n FROM donations').get().n, pendingDonations:db.prepare("SELECT COUNT(*) AS n FROM donations WHERE payment_status='Pending verification'").get().n, verifiedDonationsPaise:db.prepare("SELECT COALESCE(SUM(amount_paise),0) AS n FROM donations WHERE payment_status='Verified'").get().n
}));
app.get('/api/admin/requests',adminOnly,(_req,res)=>res.json(db.prepare('SELECT ar.*,pets.name AS pet_name FROM adoption_requests ar JOIN pets ON pets.id=ar.pet_id ORDER BY ar.id DESC').all()));
app.patch('/api/admin/requests/:id',adminOnly,(req,res)=>{const status=clean(req.body.status,20);if(!['Pending','Approved','Declined'].includes(status))return res.status(400).json({error:'Invalid status.'});const r=db.prepare('UPDATE adoption_requests SET status=? WHERE id=?').run(status,Number(req.params.id));if(!r.changes)return res.status(404).json({error:'Request not found.'});res.json({success:true});});
app.post('/api/admin/pets',adminOnly,(req,res)=>{const name=clean(req.body.name,80),type=clean(req.body.type,20),age=clean(req.body.age,40),location=clean(req.body.location,100),description=clean(req.body.description,500),image=clean(req.body.image,1000);if(!name||!validTypes.has(type)||!age||!location||!description||!validImage(image))return res.status(400).json({error:'Complete all fields and use a valid http/https image URL.'});const r=db.prepare('INSERT INTO pets (name,type,age,location,description,image) VALUES (?,?,?,?,?,?)').run(name,type,age,location,description,image);res.status(201).json(db.prepare('SELECT * FROM pets WHERE id=?').get(r.lastInsertRowid));});
app.patch('/api/admin/pets/:id/status',adminOnly,(req,res)=>{const status=clean(req.body.status,20);if(!['Available','Adopted','Unavailable'].includes(status))return res.status(400).json({error:'Invalid pet status.'});const r=db.prepare('UPDATE pets SET status=? WHERE id=?').run(status,Number(req.params.id));if(!r.changes)return res.status(404).json({error:'Pet not found.'});res.json({success:true});});
app.get('/api/admin/donations',adminOnly,(_req,res)=>res.json(db.prepare('SELECT * FROM donations ORDER BY id DESC').all()));
app.patch('/api/admin/donations/:id',adminOnly,(req,res)=>{const status=clean(req.body.payment_status,30);if(!['Pending verification','Verified','Rejected'].includes(status))return res.status(400).json({error:'Invalid payment status.'});const r=db.prepare('UPDATE donations SET payment_status=? WHERE id=?').run(status,Number(req.params.id));if(!r.changes)return res.status(404).json({error:'Donation not found.'});res.json({success:true});});
app.post('/api/admin/donation-uses',adminOnly,(req,res)=>{const amount=Number(req.body.amount),purpose=clean(req.body.purpose,300),proof_url=clean(req.body.proof_url,1000),donation_ids=clean(req.body.donation_ids,200);if(!Number.isFinite(amount)||amount<=0||amount>1000000||Math.round(amount*100)!==amount*100||!purpose||!validImage(proof_url))return res.status(400).json({error:'Enter a valid amount, purpose and HTTP/HTTPS proof URL.'});const r=db.prepare('INSERT INTO donation_uses (amount_paise,purpose,proof_url,donation_ids,published) VALUES (?,?,?,?,1)').run(Math.round(amount*100),purpose,proof_url,donation_ids);res.status(201).json({success:true,id:r.lastInsertRowid});});
app.get('/api/admin/stray-reports',adminOnly,(_req,res)=>res.json(db.prepare('SELECT * FROM stray_reports ORDER BY CASE urgency WHEN \'Urgent\' THEN 0 WHEN \'High\' THEN 1 ELSE 2 END, id DESC').all()));
app.patch('/api/admin/stray-reports/:id',adminOnly,(req,res)=>{const status=clean(req.body.status,20);if(!['New','Contacted','Referred to shelter','Resolved','Closed'].includes(status))return res.status(400).json({error:'Invalid report status.'});const r=db.prepare('UPDATE stray_reports SET status=? WHERE id=?').run(status,Number(req.params.id));if(!r.changes)return res.status(404).json({error:'Report not found.'});res.json({success:true});});
app.get('/api/admin/shelters',adminOnly,(_req,res)=>res.json(db.prepare('SELECT * FROM shelters ORDER BY CASE status WHEN \'Pending\' THEN 0 ELSE 1 END, id DESC').all()));
app.patch('/api/admin/shelters/:id',adminOnly,(req,res)=>{const status=clean(req.body.status,20);if(!['Pending','Approved','Declined'].includes(status))return res.status(400).json({error:'Invalid status.'});const r=db.prepare('UPDATE shelters SET status=? WHERE id=?').run(status,Number(req.params.id));if(!r.changes)return res.status(404).json({error:'Partner submission not found.'});res.json({success:true});});
app.use((err,_req,res,_next)=>{if(err instanceof multer.MulterError)return res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'Photo must be 5 MB or smaller.':'Please upload one image only.'});res.status(500).json({error:'Something went wrong. Please try again.'});});
app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found.'}));
app.get('/admin',(_req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('*',(_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`🐾 Paw Connect v3 running at http://localhost:${PORT}`));
