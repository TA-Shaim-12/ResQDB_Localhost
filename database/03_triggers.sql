-- =====================================================================
-- ResQDB — 03_triggers.sql : Triggers with real operational purpose
-- =====================================================================
USE resqdb;

DELIMITER $$

-- Trigger 1: When a relief shipment is recorded (DistributionItem inserted),
-- automatically decrease the warehouse's inventory for that item.
-- Blocks the insert if stock is insufficient (data integrity).
CREATE TRIGGER trg_distributionitem_after_insert
AFTER INSERT ON DistributionItem
FOR EACH ROW
BEGIN
    DECLARE v_warehouse_id INT;
    DECLARE v_available    DECIMAL(12,2);

    SELECT warehouse_id INTO v_warehouse_id
    FROM Distribution
    WHERE distribution_id = NEW.distribution_id;

    SELECT quantity INTO v_available
    FROM Inventory
    WHERE warehouse_id = v_warehouse_id AND item_id = NEW.item_id
    FOR UPDATE;

    IF v_available IS NULL OR v_available < NEW.quantity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient warehouse inventory for this distribution item';
    END IF;

    UPDATE Inventory
    SET quantity = quantity - NEW.quantity
    WHERE warehouse_id = v_warehouse_id AND item_id = NEW.item_id;
END$$

-- Trigger 2: When a victim is assigned to a shelter on insert, bump occupancy
-- and flip status to 'Full' once capacity is reached.
CREATE TRIGGER trg_victim_after_insert
AFTER INSERT ON Victim
FOR EACH ROW
BEGIN
    IF NEW.shelter_id IS NOT NULL THEN
        UPDATE Shelter
        SET current_occupancy = current_occupancy + 1,
            status = IF(current_occupancy + 1 >= capacity, 'Full', status)
        WHERE shelter_id = NEW.shelter_id;
    END IF;
END$$

-- Trigger 3: When a victim's shelter assignment changes (moved/transferred),
-- decrement the old shelter and increment the new one, updating status both ways.
CREATE TRIGGER trg_victim_after_update
AFTER UPDATE ON Victim
FOR EACH ROW
BEGIN
    IF NOT (OLD.shelter_id <=> NEW.shelter_id) THEN
        IF OLD.shelter_id IS NOT NULL THEN
            UPDATE Shelter
            SET current_occupancy = current_occupancy - 1,
                status = IF(current_occupancy - 1 < capacity, 'Available', status)
            WHERE shelter_id = OLD.shelter_id;
        END IF;
        IF NEW.shelter_id IS NOT NULL THEN
            UPDATE Shelter
            SET current_occupancy = current_occupancy + 1,
                status = IF(current_occupancy + 1 >= capacity, 'Full', status)
            WHERE shelter_id = NEW.shelter_id;
        END IF;
    END IF;
END$$

-- Trigger 4: Prevent an emergency request from being marked 'Resolved'
-- unless a rescue team has actually been assigned to it.
CREATE TRIGGER trg_request_before_update
BEFORE UPDATE ON EmergencyRequest
FOR EACH ROW
BEGIN
    IF NEW.status = 'Resolved' AND NEW.assigned_team_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot resolve a request with no rescue team assigned';
    END IF;
END$$

DELIMITER ;
