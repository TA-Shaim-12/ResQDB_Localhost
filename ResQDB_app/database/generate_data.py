"""
ResQDB synthetic data generator
--------------------------------
Generates realistic-but-fictional operational data (victims, volunteers,
shelters, distributions, etc.) layered on top of REAL Bangladesh geography
(district/upazila names). No real personal data is used anywhere -- all
victim/volunteer/doctor/driver names are randomly assembled from common
Bangladeshi given/surname pools, per the "no real people" rule.

Uses only the Python standard library (random, datetime) so it runs
anywhere with no pip install / internet access required.

Output: one .sql file (sql/06_sample_data.sql) containing INSERT statements
for every table, in FK-safe order, ready to run after 01_schema.sql.
"""
import random
from datetime import datetime, timedelta

random.seed(42)  # reproducible output

OUT_PATH = "/home/claude/resqdb_app/database/05_sample_data.sql"

# ---------------------------------------------------------------------
# Real reference geography: a representative subset of Bangladesh
# districts + upazilas (coastal/flood-prone districts emphasized, since
# the project focuses on flood & cyclone response).
# ---------------------------------------------------------------------
DISTRICTS = {
    "Satkhira":   ["Shyamnagar", "Kaliganj", "Assasuni", "Satkhira Sadar"],
    "Khulna":     ["Koyra", "Dacope", "Paikgachha", "Khulna Sadar"],
    "Bagerhat":   ["Mongla", "Sarankhola", "Morrelganj"],
    "Barguna":    ["Patharghata", "Amtali", "Barguna Sadar"],
    "Patuakhali": ["Kalapara", "Galachipa", "Patuakhali Sadar"],
    "Bhola":      ["Char Fasson", "Monpura", "Bhola Sadar"],
    "Noakhali":   ["Hatiya", "Subarnachar", "Noakhali Sadar"],
    "Chattogram": ["Sandwip", "Banshkhali", "Anwara"],
    "Cox's Bazar":["Cox's Bazar Sadar", "Teknaf", "Ukhia"],
    "Sirajganj":  ["Kazipur", "Chauhali", "Sirajganj Sadar"],
    "Kurigram":   ["Chilmari", "Rajarhat", "Kurigram Sadar"],
    "Jamalpur":   ["Islampur", "Dewanganj", "Jamalpur Sadar"],
    "Pirojpur":   ["Mathbaria", "Bhandaria", "Pirojpur Sadar"],
    "Jhalokati":  ["Kathalia", "Nalchity", "Jhalokati Sadar"],
    "Feni":       ["Sonagazi", "Feni Sadar", "Chhagalnaiya"],
    "Lakshmipur": ["Ramgati", "Kamalnagar", "Lakshmipur Sadar"],
    "Gaibandha":  ["Fulchhari", "Sundarganj", "Gaibandha Sadar"],
    "Faridpur":   ["Charbhadrasan", "Sadarpur", "Faridpur Sadar"],
}


DISASTERS = [
    ("Cyclone Remal", "Cyclone", "2026-05-26", "2026-05-29", "Severe",
     "Category 1 cyclone that made landfall on the Bangladesh-West Bengal coast, "
     "causing storm surges and widespread flooding in coastal districts."),
    ("Monsoon Flood 2026", "Flood", "2026-07-10", "2026-07-25", "Catastrophic",
     "Heavy monsoon rainfall and upstream water flow caused severe riverine "
     "flooding across northern districts."),
    ("Cyclone Rimal Aftermath Flood", "Flood", "2026-06-02", "2026-06-15", "Moderate",
     "Secondary flooding from tidal surge breaches following Cyclone Remal."),
]

ORG_TYPES = ["Government Agency", "NGO", "Volunteer Organization",
             "Medical Organization", "International Aid Organization"]
ORG_NAMES = [
    ("Bangladesh Department of Disaster Management", "Government Agency"),
    ("Bangladesh Red Crescent Society", "NGO"),
    ("Coastal Relief Volunteers", "Volunteer Organization"),
    ("Doctors Without Borders - Bangladesh Ops", "Medical Organization"),
    ("Global Humanitarian Aid Network", "International Aid Organization"),
    ("BRAC Emergency Response", "NGO"),
    ("Bangladesh Coast Guard", "Government Agency"),
    ("Islamic Relief Bangladesh", "NGO"),
    ("Community Health Corps", "Medical Organization"),
    ("UN World Food Programme - BD", "International Aid Organization"),
]

FIRST_NAMES_M = ["Abir", "Rakib", "Farhan", "Shakil", "Tanvir", "Imran", "Hasan",
                  "Rafiq", "Kamal", "Shohel", "Nayeem", "Jahid", "Mahfuz", "Rezaul"]
FIRST_NAMES_F = ["Nusrat", "Sharmin", "Farzana", "Rima", "Sadia", "Taslima",
                  "Moushumi", "Afsana", "Ruma", "Shirin", "Kohinoor", "Anika"]
LAST_NAMES = ["Islam", "Rahman", "Hossain", "Ahmed", "Akter", "Chowdhury",
              "Khan", "Mia", "Sarker", "Talukder", "Molla", "Bepari"]

RELIEF_ITEMS = [
    ("Rice", "Food", "kg"), ("Lentils", "Food", "kg"), ("Cooking Oil", "Food", "liter"),
    ("Drinking Water", "Water", "liter"), ("Water Purification Tablets", "Water", "packet"),
    ("ORS", "Medicine", "packet"), ("Paracetamol", "Medicine", "strip"),
    ("First Aid Kit", "Medicine", "piece"), ("Blanket", "Shelter", "piece"),
    ("Tarpaulin Sheet", "Shelter", "piece"), ("Water Purifier Candle", "Water", "piece"),
    ("Dry Snacks", "Food", "packet"),
]

VEHICLE_TYPES = ["Truck", "Boat", "Van", "Helicopter"]

def rand_date(start, end):
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(delta, 0)))

def person_name():
    if random.random() < 0.5:
        first = random.choice(FIRST_NAMES_M)
        gender = "Male"
    else:
        first = random.choice(FIRST_NAMES_F)
        gender = "Female"
    return f"{first} {random.choice(LAST_NAMES)}", gender

def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

lines = []
def emit(sql):
    lines.append(sql)

emit("-- =====================================================================")
emit("-- ResQDB — 06_sample_data.sql : Generated sample data (hybrid: real")
emit("-- geography/disaster reference data + fictional operational records)")
emit("-- Auto-generated by data/generate_data.py -- do not hand-edit.")
emit("-- =====================================================================")
emit("USE resqdb;")
emit("SET FOREIGN_KEY_CHECKS = 0;")
emit("")

# ---------------- District / Upazila ----------------
district_ids = {}
upazila_ids = {}
did = 1
uid = 1
emit("-- District & Upazila (real Bangladesh geography, flood/cyclone-prone subset)")
for dist_name, upazilas in DISTRICTS.items():
    emit(f"INSERT INTO District (district_id, district_name) VALUES ({did}, {esc(dist_name)});")
    district_ids[dist_name] = did
    for up_name in upazilas:
        emit(f"INSERT INTO Upazila (upazila_id, upazila_name, district_id) VALUES ({uid}, {esc(up_name)}, {did});")
        upazila_ids[(dist_name, up_name)] = uid
        uid += 1
    did += 1

all_upazila_ids = list(upazila_ids.values())

# ---------------- Organizations ----------------
emit("\n-- Organizations")
org_ids = []
for i, (name, otype) in enumerate(ORG_NAMES, start=1):
    email = name.lower().replace(" ", ".").replace("'", "")[:40] + "@resq.org"
    phone = f"+8801{random.randint(700000000, 999999999)}"
    emit(f"INSERT INTO Organization (organization_id, org_name, org_type, contact_email, contact_phone) "
         f"VALUES ({i}, {esc(name)}, {esc(otype)}, {esc(email)}, {esc(phone)});")
    org_ids.append(i)

# ---------------- Disasters ----------------
emit("\n-- Disasters")
disaster_ids = []
for i, (name, dtype, sdate, edate, sev, desc) in enumerate(DISASTERS, start=1):
    emit(f"INSERT INTO Disaster (disaster_id, disaster_name, disaster_type, start_date, end_date, severity, description) "
         f"VALUES ({i}, {esc(name)}, {esc(dtype)}, {esc(sdate)}, {esc(edate)}, {esc(sev)}, {esc(desc)});")
    disaster_ids.append(i)

# ---------------- Affected Areas ----------------
emit("\n-- Affected Areas")
area_ids = []
aid = 1
severities = ["Low", "Moderate", "Severe", "Catastrophic"]
for (dist_name, up_name), uz_id in upazila_ids.items():
    # not every upazila is affected by every disaster; pick 1-2 disasters per upazila
    for disaster_id in random.sample(disaster_ids, k=random.randint(1, 2)):
        population = random.randint(15000, 180000)
        severity = random.choice(severities)
        area_name = f"{up_name} Affected Zone"
        emit(f"INSERT INTO AffectedArea (area_id, area_name, upazila_id, disaster_id, population, severity) "
             f"VALUES ({aid}, {esc(area_name)}, {uz_id}, {disaster_id}, {population}, {esc(severity)});")
        area_ids.append(aid)
        aid += 1

# ---------------- Shelters ----------------
emit("\n-- Shelters")
shelter_ids = []
sid = 1
shelter_kinds = ["High School", "Cyclone Shelter", "Community Center", "Union Parishad Complex", "College"]
for uz_id in all_upazila_ids:
    for _ in range(random.randint(1, 2)):
        capacity = random.choice([300, 500, 800, 1000, 1500, 2000])
        occupancy = random.randint(0, capacity)  # will be overwritten as victims are assigned below; kept low-consistent
        occupancy = 0  # start at 0; victim inserts below will increment via trigger logic replicated in data
        status = "Available"
        name = f"{random.choice(shelter_kinds)} Shelter {sid}"
        emit(f"INSERT INTO Shelter (shelter_id, shelter_name, upazila_id, capacity, current_occupancy, status) "
             f"VALUES ({sid}, {esc(name)}, {uz_id}, {capacity}, {occupancy}, {esc(status)});")
        shelter_ids.append((sid, capacity))
        sid += 1

# ---------------- Rescue Teams ----------------
emit("\n-- Rescue Teams")
team_ids = []
team_types = ["Rescue", "Medical", "Evacuation", "Logistics"]
for tid in range(1, 46):
    org = random.choice(org_ids)
    ttype = random.choice(team_types)
    members = random.randint(6, 20)
    status = random.choice(["Available", "Deployed", "Off Duty"])
    name = f"{ttype} Team {tid}"
    emit(f"INSERT INTO RescueTeam (team_id, team_name, organization_id, team_type, member_count, status) "
         f"VALUES ({tid}, {esc(name)}, {org}, {esc(ttype)}, {members}, {esc(status)});")
    team_ids.append(tid)

# ---------------- Warehouses & Inventory ----------------
emit("\n-- Warehouses")
warehouse_ids = []
for wid in range(1, 23):
    org = random.choice(org_ids)
    dist_name = random.choice(list(DISTRICTS.keys()))
    location = f"{dist_name} Central Warehouse"
    capacity = random.choice([20000, 30000, 50000])
    emit(f"INSERT INTO Warehouse (warehouse_id, location, capacity, organization_id) "
         f"VALUES ({wid}, {esc(location)}, {capacity}, {org});")
    warehouse_ids.append(wid)

emit("\n-- Relief Items")
for iid, (name, cat, unit) in enumerate(RELIEF_ITEMS, start=1):
    emit(f"INSERT INTO ReliefItem (item_id, item_name, category, unit) "
         f"VALUES ({iid}, {esc(name)}, {esc(cat)}, {esc(unit)});")
item_ids = list(range(1, len(RELIEF_ITEMS) + 1))

emit("\n-- Inventory (every warehouse stocks every item, varying quantity)")
inventory_stock = {}
for wid in warehouse_ids:
    for iid in item_ids:
        qty = round(random.uniform(200, 25000), 2)
        inventory_stock[(wid, iid)] = qty
        emit(f"INSERT INTO Inventory (warehouse_id, item_id, quantity) VALUES ({wid}, {iid}, {qty});")

# ---------------- Vehicles & Drivers ----------------
emit("\n-- Vehicles")
vehicle_ids = []
for vid in range(1, 76):
    org = random.choice(org_ids)
    vtype = random.choice(VEHICLE_TYPES)
    cap = round(random.uniform(1, 10), 2) if vtype != "Helicopter" else round(random.uniform(0.5, 2), 2)
    status = random.choice(["Available", "In Transit", "Under Maintenance"])
    emit(f"INSERT INTO Vehicle (vehicle_id, vehicle_type, capacity_tons, status, organization_id) "
         f"VALUES ({vid}, {esc(vtype)}, {cap}, {esc(status)}, {org});")
    vehicle_ids.append(vid)

emit("\n-- Drivers")
driver_ids = []
for did_ in range(1, 46):
    name, _ = person_name()
    license_no = f"DL-{random.randint(100000,999999)}"
    contact = f"+8801{random.randint(700000000, 999999999)}"
    emit(f"INSERT INTO Driver (driver_id, driver_name, license_no, contact) "
         f"VALUES ({did_}, {esc(name)}, {esc(license_no)}, {esc(contact)});")
    driver_ids.append(did_)

# ---------------- Medical Camps / Doctors ----------------
emit("\n-- Medical Camps")
camp_ids = []
for cid in range(1, 26):
    uz_id = random.choice(all_upazila_ids)
    org = random.choice(org_ids)
    location = f"Medical Camp {cid}"
    emit(f"INSERT INTO MedicalCamp (medical_camp_id, location, upazila_id, organization_id) "
         f"VALUES ({cid}, {esc(location)}, {uz_id}, {org});")
    camp_ids.append(cid)

emit("\n-- Doctors")
specializations = ["General Medicine", "Pediatrics", "Emergency Medicine", "Surgery", "Public Health"]
doctor_ids = []
for did_ in range(1, 56):
    name, _ = person_name()
    spec = random.choice(specializations)
    contact = f"+8801{random.randint(700000000, 999999999)}"
    emit(f"INSERT INTO Doctor (doctor_id, doctor_name, specialization, contact) "
         f"VALUES ({did_}, {esc(name)}, {esc(spec)}, {esc(contact)});")
    doctor_ids.append(did_)

emit("\n-- Medical Camp Assignments")
mca_id = 1
for _ in range(90):
    doc = random.choice(doctor_ids)
    camp = random.choice(camp_ids)
    date = rand_date(datetime(2026,5,26), datetime(2026,7,25)).date()
    served = random.randint(10, 90)
    emit(f"INSERT INTO MedicalCampAssignment (assignment_id, doctor_id, medical_camp_id, assigned_date, patients_served) "
         f"VALUES ({mca_id}, {doc}, {camp}, {esc(date)}, {served});")
    mca_id += 1

# ---------------- Victims ----------------
emit("\n-- Victims (fictional, pseudonymous)")
victim_ids = []
vid = 1
shelter_occ = {sid: 0 for sid, _ in shelter_ids}
shelter_cap = {sid: cap for sid, cap in shelter_ids}
for area_id in area_ids:
    n_victims = random.randint(60, 160)
    for _ in range(n_victims):
        name, gender = person_name()
        age = random.randint(1, 85)
        contact = f"+8801{random.randint(700000000, 999999999)}" if age >= 15 else "NULL"
        contact_sql = esc(contact) if contact != "NULL" else "NULL"
        # ~55% of victims get assigned a shelter (with room left)
        shelter_id_val = "NULL"
        if random.random() < 0.55:
            candidates = [sid for sid, _ in shelter_ids if shelter_occ[sid] < shelter_cap[sid]]
            if candidates:
                chosen = random.choice(candidates)
                shelter_occ[chosen] += 1
                shelter_id_val = str(chosen)
        emit(f"INSERT INTO Victim (victim_id, victim_name, age, gender, contact, area_id, shelter_id) "
             f"VALUES ({vid}, {esc(name)}, {age}, {esc(gender)}, {contact_sql}, {area_id}, {shelter_id_val});")
        victim_ids.append((vid, area_id))
        vid += 1

# Sync shelter occupancy/status to match generated victim assignments
emit("\n-- Sync shelter occupancy counters with assigned victims (data generated directly; on a live")
emit("-- system the triggers in 03_triggers.sql keep this in sync automatically going forward)")
for sid_, _ in shelter_ids:
    occ = shelter_occ[sid_]
    cap = shelter_cap[sid_]
    status = "Full" if occ >= cap else "Available"
    emit(f"UPDATE Shelter SET current_occupancy = {occ}, status = {esc(status)} WHERE shelter_id = {sid_};")

# ---------------- Emergency Requests ----------------
emit("\n-- Emergency Requests")
req_types = ["Food", "Water", "Medical", "Rescue", "Evacuation"]
priorities = ["Low", "Medium", "High"]
statuses = ["Pending", "Assigned", "Resolved", "Cancelled"]
req_id = 1
n_requests = min(7000, len(victim_ids) * 2)
for _ in range(n_requests):
    victim_id, area_id = random.choice(victim_ids)
    rtype = random.choice(req_types)
    priority = random.choices(priorities, weights=[0.3, 0.4, 0.3])[0]
    date = rand_date(datetime(2026,5,26), datetime(2026,7,25))
    status = random.choices(statuses, weights=[0.25, 0.2, 0.45, 0.1])[0]
    team_val = "NULL"
    if status in ("Assigned", "Resolved"):
        team_val = str(random.choice(team_ids))
    emit(f"INSERT INTO EmergencyRequest (request_id, victim_id, area_id, request_type, priority, request_date, status, assigned_team_id) "
         f"VALUES ({req_id}, {victim_id}, {area_id}, {esc(rtype)}, {esc(priority)}, {esc(date.strftime('%Y-%m-%d %H:%M:%S'))}, {esc(status)}, {team_val});")
    req_id += 1

# ---------------- Distributions + DistributionItems ----------------
emit("\n-- Distributions & DistributionItems")
dist_id = 1
di_rows = []
n_distributions = 1800
for _ in range(n_distributions):
    warehouse = random.choice(warehouse_ids)
    area_id = random.choice(area_ids)
    org = random.choice(org_ids)
    vehicle = random.choice(vehicle_ids) if random.random() < 0.85 else "NULL"
    date = rand_date(datetime(2026,5,27), datetime(2026,7,25))
    emit(f"INSERT INTO Distribution (distribution_id, warehouse_id, area_id, organization_id, vehicle_id, distribution_date) "
         f"VALUES ({dist_id}, {warehouse}, {area_id}, {org}, {vehicle}, {esc(date.strftime('%Y-%m-%d %H:%M:%S'))});")
    # 1-3 items per distribution. Quantity is strictly capped by remaining
    # stock at this exact moment, matching what trg_distributionitem_after_insert
    # will check on the live server -- never generate more than is available.
    available_items = [i for i in item_ids if inventory_stock.get((warehouse, i), 0) >= 1]
    k = min(random.randint(1, 3), len(available_items))
    for iid in random.sample(available_items, k=k) if k > 0 else []:
        stock = inventory_stock.get((warehouse, iid), 0)
        max_qty = min(500, stock)
        low_bound = min(10, max_qty)          # never let the low bound exceed max_qty
        qty = round(random.uniform(low_bound, max_qty), 2)
        qty = min(qty, stock)                  # hard safety cap
        if qty <= 0:
            continue
        inventory_stock[(warehouse, iid)] = round(stock - qty, 2)
        emit(f"INSERT INTO DistributionItem (distribution_id, item_id, quantity) VALUES ({dist_id}, {iid}, {qty});")
    dist_id += 1

# Re-sync inventory to reflect the distributions applied above (since trigger
# only fires on live inserts against the running server, not this static file's
# ordering nuance) -- but since we generate Inventory *before* Distribution and
# want the shipped-out quantities reflected, overwrite final inventory values.
emit("\n-- Final inventory snapshot after generated distributions")
for (wid, iid), qty in inventory_stock.items():
    emit(f"UPDATE Inventory SET quantity = {round(qty,2)} WHERE warehouse_id = {wid} AND item_id = {iid};")

# ---------------- Transport Assignments ----------------
emit("\n-- Transport Assignments")
ta_id = 1
for d in range(1, min(900, dist_id) ):
    if random.random() < 0.7:
        vehicle = random.choice(vehicle_ids)
        driver = random.choice(driver_ids)
        date = rand_date(datetime(2026,5,27), datetime(2026,7,25))
        emit(f"INSERT INTO TransportAssignment (assignment_id, vehicle_id, driver_id, distribution_id, assigned_date) "
             f"VALUES ({ta_id}, {vehicle}, {driver}, {d}, {esc(date.strftime('%Y-%m-%d %H:%M:%S'))});")
        ta_id += 1

# ---------------- Volunteers & Assignments ----------------
emit("\n-- Volunteers")
volunteer_ids = []
for vol_id in range(1, 651):
    name, _ = person_name()
    age = random.randint(18, 55)
    contact = f"+8801{random.randint(700000000, 999999999)}"
    org = random.choice(org_ids)
    emit(f"INSERT INTO Volunteer (volunteer_id, volunteer_name, age, contact, organization_id) "
         f"VALUES ({vol_id}, {esc(name)}, {age}, {esc(contact)}, {org});")
    volunteer_ids.append(vol_id)

emit("\n-- Volunteer Assignments (duty rotations)")
va_id = 1
duty_types = ["Shelter", "RescueTeam", "Distribution", "MedicalCamp"]
for _ in range(1200):
    vol = random.choice(volunteer_ids)
    duty = random.choice(duty_types)
    date = rand_date(datetime(2026,5,27), datetime(2026,7,25)).date()
    shelter_val = team_val = dist_val = camp_val = "NULL"
    if duty == "Shelter":
        shelter_val = str(random.choice(shelter_ids)[0])
    elif duty == "RescueTeam":
        team_val = str(random.choice(team_ids))
    elif duty == "Distribution":
        dist_val = str(random.randint(1, dist_id - 1))
    else:
        camp_val = str(random.choice(camp_ids))
    emit(f"INSERT INTO VolunteerAssignment (assignment_id, volunteer_id, duty_type, shelter_id, team_id, distribution_id, medical_camp_id, assigned_date) "
         f"VALUES ({va_id}, {vol}, {esc(duty)}, {shelter_val}, {team_val}, {dist_val}, {camp_val}, {esc(date)});")
    va_id += 1

emit("\nSET FOREIGN_KEY_CHECKS = 1;")

with open(OUT_PATH, "w") as f:
    f.write("\n".join(lines) + "\n")

print(f"Generated {len(lines)} SQL statements -> {OUT_PATH}")
print(f"Districts: {len(DISTRICTS)}, Upazilas: {len(all_upazila_ids)}, Areas: {len(area_ids)}, "
      f"Shelters: {len(shelter_ids)}, Victims: {len(victim_ids)}, Requests: {n_requests}, "
      f"Distributions: {n_distributions}, Volunteers: {len(volunteer_ids)}")
