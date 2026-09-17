-- =====================================================================
-- ResQDB — 02_views.sql : Reporting views
-- =====================================================================
USE resqdb;

-- View 1: EmergencyDashboard
-- One row per affected area: population, pending requests, nearby shelter
-- capacity, and how many relief distributions it has received.
CREATE OR REPLACE VIEW EmergencyDashboard AS
SELECT
    aa.area_id,
    aa.area_name,
    aa.population                              AS affected_population,
    aa.severity,
    COUNT(DISTINCT CASE WHEN er.status = 'Pending' THEN er.request_id END) AS pending_requests,
    COALESCE(sh.total_shelter_capacity, 0)     AS shelter_capacity_nearby,
    COALESCE(dist.distribution_count, 0)       AS relief_distributions_received
FROM AffectedArea aa
LEFT JOIN EmergencyRequest er ON er.area_id = aa.area_id
LEFT JOIN (
    SELECT upazila_id, SUM(capacity) AS total_shelter_capacity
    FROM Shelter
    GROUP BY upazila_id
) sh ON sh.upazila_id = aa.upazila_id
LEFT JOIN (
    SELECT area_id, COUNT(*) AS distribution_count
    FROM Distribution
    GROUP BY area_id
) dist ON dist.area_id = aa.area_id
GROUP BY aa.area_id, aa.area_name, aa.population, aa.severity,
         sh.total_shelter_capacity, dist.distribution_count;

-- View 2: ReliefInventoryStatus
-- Current stock of every item at every warehouse.
CREATE OR REPLACE VIEW ReliefInventoryStatus AS
SELECT
    w.warehouse_id,
    w.location          AS warehouse_location,
    ri.item_id,
    ri.item_name,
    ri.category,
    i.quantity           AS available_quantity,
    ri.unit
FROM Inventory i
JOIN Warehouse  w  ON w.warehouse_id = i.warehouse_id
JOIN ReliefItem ri ON ri.item_id     = i.item_id;

-- View 3: ShelterStatus
-- Quick occupancy snapshot per shelter.
CREATE OR REPLACE VIEW ShelterStatus AS
SELECT
    shelter_id,
    shelter_name,
    capacity,
    current_occupancy,
    (capacity - current_occupancy) AS available_space,
    status
FROM Shelter;
