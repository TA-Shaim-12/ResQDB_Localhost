-- =====================================================================
-- ResQDB — Flood & Cyclone Emergency Response and Relief Management System
-- 01_schema.sql : Database + Table Definitions (3NF, InnoDB, MySQL 8.0+)
-- =====================================================================

DROP DATABASE IF EXISTS resqdb;
CREATE DATABASE resqdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE resqdb;

-- ---------------------------------------------------------------------
-- 1. Geography / reference data
-- ---------------------------------------------------------------------
CREATE TABLE District (
    district_id     INT AUTO_INCREMENT PRIMARY KEY,
    district_name   VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE Upazila (
    upazila_id      INT AUTO_INCREMENT PRIMARY KEY,
    upazila_name    VARCHAR(100) NOT NULL,
    district_id     INT NOT NULL,
    FOREIGN KEY (district_id) REFERENCES District(district_id) ON DELETE CASCADE,
    UNIQUE KEY uq_upazila_district (upazila_name, district_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. Organizations (govt agencies, NGOs, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE Organization (
    organization_id INT AUTO_INCREMENT PRIMARY KEY,
    org_name        VARCHAR(150) NOT NULL,
    org_type        ENUM('Government Agency','NGO','Volunteer Organization',
                          'Medical Organization','International Aid Organization') NOT NULL,
    contact_email   VARCHAR(150),
    contact_phone   VARCHAR(30)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. Disaster & affected areas
-- ---------------------------------------------------------------------
CREATE TABLE Disaster (
    disaster_id     INT AUTO_INCREMENT PRIMARY KEY,
    disaster_name   VARCHAR(150) NOT NULL,
    disaster_type   ENUM('Flood','Cyclone') NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    severity        ENUM('Low','Moderate','Severe','Catastrophic') NOT NULL,
    description     TEXT
) ENGINE=InnoDB;

CREATE TABLE AffectedArea (
    area_id         INT AUTO_INCREMENT PRIMARY KEY,
    area_name       VARCHAR(150) NOT NULL,
    upazila_id      INT NOT NULL,
    disaster_id     INT NOT NULL,
    population      INT,
    severity        ENUM('Low','Moderate','Severe','Catastrophic') NOT NULL,
    FOREIGN KEY (upazila_id) REFERENCES Upazila(upazila_id),
    FOREIGN KEY (disaster_id) REFERENCES Disaster(disaster_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. Shelters & victims
-- ---------------------------------------------------------------------
CREATE TABLE Shelter (
    shelter_id        INT AUTO_INCREMENT PRIMARY KEY,
    shelter_name      VARCHAR(150) NOT NULL,
    upazila_id        INT NOT NULL,
    capacity          INT NOT NULL,
    current_occupancy INT NOT NULL DEFAULT 0,
    status            ENUM('Available','Full','Closed') NOT NULL DEFAULT 'Available',
    FOREIGN KEY (upazila_id) REFERENCES Upazila(upazila_id),
    CHECK (current_occupancy >= 0)
) ENGINE=InnoDB;

CREATE TABLE Victim (
    victim_id       INT AUTO_INCREMENT PRIMARY KEY,
    victim_name     VARCHAR(100) NOT NULL,
    age             INT,
    gender          ENUM('Male','Female','Other'),
    contact         VARCHAR(30),
    area_id         INT NOT NULL,
    shelter_id      INT NULL,
    FOREIGN KEY (area_id) REFERENCES AffectedArea(area_id),
    FOREIGN KEY (shelter_id) REFERENCES Shelter(shelter_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. Rescue teams & emergency requests
-- ---------------------------------------------------------------------
CREATE TABLE RescueTeam (
    team_id         INT AUTO_INCREMENT PRIMARY KEY,
    team_name       VARCHAR(100) NOT NULL,
    organization_id INT NOT NULL,
    team_type       ENUM('Rescue','Medical','Evacuation','Logistics') NOT NULL,
    member_count    INT NOT NULL,
    status          ENUM('Available','Deployed','Off Duty') NOT NULL DEFAULT 'Available',
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id)
) ENGINE=InnoDB;

CREATE TABLE EmergencyRequest (
    request_id       INT AUTO_INCREMENT PRIMARY KEY,
    victim_id        INT NOT NULL,
    area_id          INT NOT NULL,
    request_type     ENUM('Food','Water','Medical','Rescue','Evacuation') NOT NULL,
    priority         ENUM('Low','Medium','High') NOT NULL,
    request_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status           ENUM('Pending','Assigned','Resolved','Cancelled') NOT NULL DEFAULT 'Pending',
    assigned_team_id INT NULL,
    FOREIGN KEY (victim_id) REFERENCES Victim(victim_id),
    FOREIGN KEY (area_id) REFERENCES AffectedArea(area_id),
    FOREIGN KEY (assigned_team_id) REFERENCES RescueTeam(team_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. Relief inventory
-- ---------------------------------------------------------------------
CREATE TABLE Warehouse (
    warehouse_id    INT AUTO_INCREMENT PRIMARY KEY,
    location        VARCHAR(150) NOT NULL,
    capacity        INT NOT NULL,
    organization_id INT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id)
) ENGINE=InnoDB;

CREATE TABLE ReliefItem (
    item_id     INT AUTO_INCREMENT PRIMARY KEY,
    item_name   VARCHAR(100) NOT NULL,
    category    ENUM('Food','Water','Medicine','Shelter','Other') NOT NULL,
    unit        VARCHAR(20) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Inventory (
    warehouse_id    INT NOT NULL,
    item_id         INT NOT NULL,
    quantity        DECIMAL(12,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (warehouse_id, item_id),
    FOREIGN KEY (warehouse_id) REFERENCES Warehouse(warehouse_id),
    FOREIGN KEY (item_id) REFERENCES ReliefItem(item_id),
    CHECK (quantity >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. Vehicles & drivers
-- ---------------------------------------------------------------------
CREATE TABLE Vehicle (
    vehicle_id      INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_type    ENUM('Truck','Boat','Van','Helicopter') NOT NULL,
    capacity_tons   DECIMAL(6,2),
    status          ENUM('Available','In Transit','Under Maintenance') NOT NULL DEFAULT 'Available',
    organization_id INT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id)
) ENGINE=InnoDB;

CREATE TABLE Driver (
    driver_id   INT AUTO_INCREMENT PRIMARY KEY,
    driver_name VARCHAR(100) NOT NULL,
    license_no  VARCHAR(30) NOT NULL UNIQUE,
    contact     VARCHAR(30)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. Medical camps
-- ---------------------------------------------------------------------
CREATE TABLE MedicalCamp (
    medical_camp_id INT AUTO_INCREMENT PRIMARY KEY,
    location        VARCHAR(150) NOT NULL,
    upazila_id      INT NOT NULL,
    organization_id INT NOT NULL,
    FOREIGN KEY (upazila_id) REFERENCES Upazila(upazila_id),
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id)
) ENGINE=InnoDB;

CREATE TABLE Doctor (
    doctor_id       INT AUTO_INCREMENT PRIMARY KEY,
    doctor_name     VARCHAR(100) NOT NULL,
    specialization  VARCHAR(100),
    contact         VARCHAR(30)
) ENGINE=InnoDB;

CREATE TABLE MedicalCampAssignment (
    assignment_id   INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id       INT NOT NULL,
    medical_camp_id INT NOT NULL,
    assigned_date   DATE NOT NULL,
    patients_served INT DEFAULT 0,
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id),
    FOREIGN KEY (medical_camp_id) REFERENCES MedicalCamp(medical_camp_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. Distribution (1:M + M:N resolved via associative entity)
-- ---------------------------------------------------------------------
CREATE TABLE Distribution (
    distribution_id     INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id        INT NOT NULL,
    area_id             INT NOT NULL,
    organization_id     INT NOT NULL,
    vehicle_id          INT NULL,
    distribution_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES Warehouse(warehouse_id),
    FOREIGN KEY (area_id) REFERENCES AffectedArea(area_id),
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id),
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
) ENGINE=InnoDB;

CREATE TABLE DistributionItem (
    distribution_id INT NOT NULL,
    item_id         INT NOT NULL,
    quantity        DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (distribution_id, item_id),
    FOREIGN KEY (distribution_id) REFERENCES Distribution(distribution_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES ReliefItem(item_id),
    CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE TransportAssignment (
    assignment_id   INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id      INT NOT NULL,
    driver_id       INT NOT NULL,
    distribution_id INT NOT NULL,
    assigned_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id),
    FOREIGN KEY (distribution_id) REFERENCES Distribution(distribution_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. Volunteers (M:N with multiple duty types)
-- ---------------------------------------------------------------------
CREATE TABLE Volunteer (
    volunteer_id    INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_name  VARCHAR(100) NOT NULL,
    age             INT,
    contact         VARCHAR(30),
    organization_id INT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id)
) ENGINE=InnoDB;

CREATE TABLE VolunteerAssignment (
    assignment_id   INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_id    INT NOT NULL,
    duty_type       ENUM('Shelter','RescueTeam','Distribution','MedicalCamp') NOT NULL,
    shelter_id      INT NULL,
    team_id         INT NULL,
    distribution_id INT NULL,
    medical_camp_id INT NULL,
    assigned_date   DATE NOT NULL,
    FOREIGN KEY (volunteer_id) REFERENCES Volunteer(volunteer_id),
    FOREIGN KEY (shelter_id) REFERENCES Shelter(shelter_id),
    FOREIGN KEY (team_id) REFERENCES RescueTeam(team_id),
    FOREIGN KEY (distribution_id) REFERENCES Distribution(distribution_id),
    FOREIGN KEY (medical_camp_id) REFERENCES MedicalCamp(medical_camp_id),
    CONSTRAINT chk_duty_target CHECK (
        (duty_type='Shelter' AND shelter_id IS NOT NULL) OR
        (duty_type='RescueTeam' AND team_id IS NOT NULL) OR
        (duty_type='Distribution' AND distribution_id IS NOT NULL) OR
        (duty_type='MedicalCamp' AND medical_camp_id IS NOT NULL)
    )
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Indexes for common query patterns / performance
-- ---------------------------------------------------------------------
CREATE INDEX idx_area_disaster        ON AffectedArea(disaster_id);
CREATE INDEX idx_area_upazila         ON AffectedArea(upazila_id);
CREATE INDEX idx_victim_area          ON Victim(area_id);
CREATE INDEX idx_victim_shelter       ON Victim(shelter_id);
CREATE INDEX idx_request_status_prio  ON EmergencyRequest(status, priority);
CREATE INDEX idx_request_area         ON EmergencyRequest(area_id);
CREATE INDEX idx_distribution_area    ON Distribution(area_id, distribution_date);
CREATE INDEX idx_distribution_wh      ON Distribution(warehouse_id);
CREATE INDEX idx_inventory_item       ON Inventory(item_id);
CREATE INDEX idx_shelter_upazila      ON Shelter(upazila_id);
CREATE INDEX idx_vehicle_org          ON Vehicle(organization_id);
