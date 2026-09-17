-- =====================================================================
-- ResQDB — 04_procedures.sql : Stored procedures / transactions
-- =====================================================================
USE resqdb;

DELIMITER $$

-- Procedure 1: sp_distribute_relief
-- Wraps an entire relief-distribution event in one transaction:
--   1) lock & check inventory
--   2) create the Distribution record
--   3) create the DistributionItem record (trigger decrements inventory)
-- If any step fails (e.g. insufficient stock), the whole thing rolls back
-- so you never get a "Distribution created but inventory not decreased" state.
CREATE PROCEDURE sp_distribute_relief(
    IN p_warehouse_id     INT,
    IN p_area_id          INT,
    IN p_organization_id  INT,
    IN p_vehicle_id       INT,
    IN p_item_id          INT,
    IN p_quantity         DECIMAL(12,2),
    OUT p_distribution_id INT
)
proc_body: BEGIN
    DECLARE v_available DECIMAL(12,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT quantity INTO v_available
    FROM Inventory
    WHERE warehouse_id = p_warehouse_id AND item_id = p_item_id
    FOR UPDATE;

    IF v_available IS NULL OR v_available < p_quantity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient inventory for this distribution';
    END IF;

    INSERT INTO Distribution (warehouse_id, area_id, organization_id, vehicle_id, distribution_date)
    VALUES (p_warehouse_id, p_area_id, p_organization_id, p_vehicle_id, NOW());

    SET p_distribution_id = LAST_INSERT_ID();

    -- trg_distributionitem_after_insert automatically decrements Inventory
    INSERT INTO DistributionItem (distribution_id, item_id, quantity)
    VALUES (p_distribution_id, p_item_id, p_quantity);

    COMMIT;
END$$

-- Procedure 2: sp_resolve_request
-- Marks an emergency request resolved and frees up the rescue team.
CREATE PROCEDURE sp_resolve_request(
    IN p_request_id INT
)
proc_body2: BEGIN
    DECLARE v_team_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT assigned_team_id INTO v_team_id
    FROM EmergencyRequest
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF v_team_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Assign a rescue team before resolving this request';
    END IF;

    UPDATE EmergencyRequest
    SET status = 'Resolved'
    WHERE request_id = p_request_id;

    UPDATE RescueTeam
    SET status = 'Available'
    WHERE team_id = v_team_id;

    COMMIT;
END$$

DELIMITER ;
