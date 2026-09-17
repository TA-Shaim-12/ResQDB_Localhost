// backend/routes/reference.js
// Read-heavy endpoints for the parts of the schema that don't need a full
// CRUD workflow in the console UI but are still fully part of the database
// (Vehicle, Driver, TransportAssignment, Volunteer, MedicalCamp, Doctor).
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");

router.get("/vehicles", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.vehicle_id, v.vehicle_type, v.capacity_tons, v.status, o.org_name
      FROM Vehicle v JOIN Organization o ON o.organization_id = v.organization_id
      ORDER BY v.vehicle_id
    `);
    res.json(rows);
  } catch (err) { handleDbError(err, res); }
});

router.get("/drivers", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT driver_id, driver_name, license_no, contact FROM Driver ORDER BY driver_id");
    res.json(rows);
  } catch (err) { handleDbError(err, res); }
});

router.get("/volunteers", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 25));
  const offset = (page - 1) * pageSize;
  try {
    const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM Volunteer");
    const [rows] = await pool.query(
      `SELECT vol.volunteer_id, vol.volunteer_name, vol.age, vol.contact, o.org_name
       FROM Volunteer vol JOIN Organization o ON o.organization_id = vol.organization_id
       ORDER BY vol.volunteer_id LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    res.json({ rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) { handleDbError(err, res); }
});

router.get("/medical-camps", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mc.medical_camp_id, mc.location, u.upazila_name, o.org_name,
             COUNT(mca.assignment_id) AS doctorCount,
             COALESCE(SUM(mca.patients_served), 0) AS patientsServed
      FROM MedicalCamp mc
      JOIN Upazila u ON u.upazila_id = mc.upazila_id
      JOIN Organization o ON o.organization_id = mc.organization_id
      LEFT JOIN MedicalCampAssignment mca ON mca.medical_camp_id = mc.medical_camp_id
      GROUP BY mc.medical_camp_id, mc.location, u.upazila_name, o.org_name
      ORDER BY mc.medical_camp_id
    `);
    res.json(rows);
  } catch (err) { handleDbError(err, res); }
});

router.get("/doctors", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT doctor_id, doctor_name, specialization, contact FROM Doctor ORDER BY doctor_id");
    res.json(rows);
  } catch (err) { handleDbError(err, res); }
});

module.exports = router;
